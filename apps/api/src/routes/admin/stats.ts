import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  eq,
  count,
  sum,
  sql,
  desc,
  gte,
  and,
  isNotNull,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  users,
  resources,
  forumPosts,
  forumReplies,
  resourceComments,
  resourceLikes,
  resourceRatings,
} from "../../db/schema.js";
import { authMiddleware, adminOrModerator } from "../../middleware/auth.js";

const adminStatsRoutes = new Hono();

// All routes require auth + admin/moderator role
adminStatsRoutes.use("*", authMiddleware, adminOrModerator);

// ── Helpers ───────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ── GET /api/admin/stats/overview ─────────────────────────────
// Dashboard overview: total counts + today's new items
adminStatsRoutes.get("/overview", async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ totalUsers }],
    [{ totalResources }],
    [{ totalForumPosts }],
    [{ totalComments }],
    [{ todayNewUsers }],
    [{ todayNewResources }],
    [{ todayNewPosts }],
    [{ publishedResources }],
    [{ pendingReview }],
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(users),
    db.select({ totalResources: count() }).from(resources),
    db.select({ totalForumPosts: count() }).from(forumPosts),
    db.select({ totalComments: count() }).from(resourceComments),
    db.select({ todayNewUsers: count() }).from(users).where(gte(users.createdAt, today)),
    db.select({ todayNewResources: count() }).from(resources).where(gte(resources.createdAt, today)),
    db.select({ todayNewPosts: count() }).from(forumPosts).where(gte(forumPosts.createdAt, today)),
    db.select({ publishedResources: count() }).from(resources).where(eq(resources.isPublished, true)),
    db.select({ pendingReview: count() }).from(resources).where(eq(resources.reviewStatus, "pending")),
  ]);

  return c.json({
    success: true,
    data: {
      totals: {
        users: totalUsers,
        resources: totalResources,
        forumPosts: totalForumPosts,
        comments: totalComments,
      },
      today: {
        newUsers: todayNewUsers,
        newResources: todayNewResources,
        newPosts: todayNewPosts,
      },
      resources: {
        published: publishedResources,
        pendingReview,
      },
    },
  });
});

// ── GET /api/admin/stats/trends ───────────────────────────────
// Daily registration & publishing trends for the last N days
const trendsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

adminStatsRoutes.get(
  "/trends",
  zValidator("query", trendsQuerySchema),
  async (c) => {
    const { days: dayCount } = c.req.valid("query");
    const since = daysAgo(dayCount);

    // Daily new users
    const userTrends = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})`.as("date"),
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, since))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    // Daily new resources
    const resourceTrends = await db
      .select({
        date: sql<string>`DATE(${resources.createdAt})`.as("date"),
        count: count(),
      })
      .from(resources)
      .where(gte(resources.createdAt, since))
      .groupBy(sql`DATE(${resources.createdAt})`)
      .orderBy(sql`DATE(${resources.createdAt})`);

    // Daily new forum posts
    const forumTrends = await db
      .select({
        date: sql<string>`DATE(${forumPosts.createdAt})`.as("date"),
        count: count(),
      })
      .from(forumPosts)
      .where(gte(forumPosts.createdAt, since))
      .groupBy(sql`DATE(${forumPosts.createdAt})`)
      .orderBy(sql`DATE(${forumPosts.createdAt})`);

    return c.json({
      success: true,
      data: {
        users: userTrends,
        resources: resourceTrends,
        forumPosts: forumTrends,
      },
    });
  }
);

// ── GET /api/admin/stats/resources-by-type ────────────────────
// Resource count distribution by type + review status
adminStatsRoutes.get("/resources-by-type", async (c) => {
  const byType = await db
    .select({
      type: resources.type,
      total: count(),
    })
    .from(resources)
    .groupBy(resources.type);

  const byReviewStatus = await db
    .select({
      status: resources.reviewStatus,
      total: count(),
    })
    .from(resources)
    .groupBy(resources.reviewStatus);

  const bySourceApp = await db
    .select({
      sourceApp: resources.sourceApp,
      total: count(),
    })
    .from(resources)
    .groupBy(resources.sourceApp);

  return c.json({
    success: true,
    data: {
      byType: byType.map((r) => ({ type: r.type, total: r.total })),
      byReviewStatus: byReviewStatus.map((r) => ({ status: r.status, total: r.total })),
      bySourceApp: bySourceApp.map((r) => ({ sourceApp: r.sourceApp, total: r.total })),
    },
  });
});

// ── GET /api/admin/stats/top-resources ────────────────────────
// Top resources by downloads, likes, or rating
const topResourcesQuerySchema = z.object({
  sort: z.enum(["downloads", "likes"]).default("downloads"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

adminStatsRoutes.get(
  "/top-resources",
  zValidator("query", topResourcesQuerySchema),
  async (c) => {
    const { sort, limit } = c.req.valid("query");

    const orderBy =
      sort === "likes" ? desc(resources.likes) : desc(resources.downloads);

    const items = await db
      .select({
        id: resources.id,
        name: resources.name,
        type: resources.type,
        downloads: resources.downloads,
        likes: resources.likes,
        reviewStatus: resources.reviewStatus,
        isPublished: resources.isPublished,
        createdAt: resources.createdAt,
        authorUsername: users.username,
      })
      .from(resources)
      .leftJoin(users, eq(resources.authorId, users.id))
      .orderBy(orderBy)
      .limit(limit);

    return c.json({ success: true, data: items });
  }
);

// ── GET /api/admin/stats/top-users ────────────────────────────
// Most active users by resource count, downloads, or likes
const topUsersQuerySchema = z.object({
  sort: z.enum(["resources", "downloads", "likes"]).default("resources"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

adminStatsRoutes.get(
  "/top-users",
  zValidator("query", topUsersQuerySchema),
  async (c) => {
    const { sort, limit } = c.req.valid("query");

    // Aggregate stats per user
    const userStats = await db
      .select({
        userId: resources.authorId,
        username: users.username,
        avatarUrl: users.avatarUrl,
        resourceCount: count(),
        totalDownloads: sum(resources.downloads),
        totalLikes: sum(resources.likes),
      })
      .from(resources)
      .innerJoin(users, eq(resources.authorId, users.id))
      .groupBy(resources.authorId, users.username, users.avatarUrl);

    // Sort in-memory (drizzle can't sort by aggregated alias easily)
    const sorted = userStats.sort((a, b) => {
      if (sort === "downloads") {
        return Number(b.totalDownloads) - Number(a.totalDownloads);
      }
      if (sort === "likes") {
        return Number(b.totalLikes) - Number(a.totalLikes);
      }
      return b.resourceCount - a.resourceCount;
    });

    return c.json({
      success: true,
      data: sorted.slice(0, limit).map((u) => ({
        userId: u.userId,
        username: u.username,
        avatarUrl: u.avatarUrl,
        resourceCount: u.resourceCount,
        totalDownloads: Number(u.totalDownloads) || 0,
        totalLikes: Number(u.totalLikes) || 0,
      })),
    });
  }
);

// ── GET /api/admin/stats/forum ────────────────────────────────
// Forum activity summary
adminStatsRoutes.get("/forum", async (c) => {
  const sevenDaysAgo = daysAgo(7);

  const [
    [{ totalCategories }],
    [{ totalPosts }],
    [{ totalReplies }],
    [{ pinnedPosts }],
    [{ lockedPosts }],
    [{ recentPosts }],
    [{ recentReplies }],
  ] = await Promise.all([
    db.select({ totalCategories: count() }).from(sql`forum_categories`),
    db.select({ totalPosts: count() }).from(forumPosts),
    db.select({ totalReplies: count() }).from(forumReplies),
    db.select({ pinnedPosts: count() }).from(forumPosts).where(eq(forumPosts.isPinned, true)),
    db.select({ lockedPosts: count() }).from(forumPosts).where(eq(forumPosts.isLocked, true)),
    db.select({ recentPosts: count() }).from(forumPosts).where(gte(forumPosts.createdAt, sevenDaysAgo)),
    db.select({ recentReplies: count() }).from(forumReplies).where(gte(forumReplies.createdAt, sevenDaysAgo)),
  ]);

  return c.json({
    success: true,
    data: {
      totalCategories,
      totalPosts,
      totalReplies,
      pinnedPosts,
      lockedPosts,
      last7Days: {
        newPosts: recentPosts,
        newReplies: recentReplies,
      },
    },
  });
});

export { adminStatsRoutes };
