import { Hono } from "hono";
import { eq, desc, count, and, sum, avg, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  users,
  resources,
  resourceLikes,
  resourceComments,
  resourceRatings,
  resourceFavorites,
} from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const userRoutes = new Hono();

// ── GET /api/users/me — current authenticated user ──────────
userRoutes.get("/me", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(resources)
    .where(
      and(eq(resources.authorId, user.id), eq(resources.isPublished, true))
    );

  return c.json({
    success: true,
    data: { ...user, resourceCount: total },
  });
});

// ── GET /api/users/:username ────────────────────────────────
userRoutes.get("/:username", async (c) => {
  const username = c.req.param("username");

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  // Get resource count
  const [{ total }] = await db
    .select({ total: count() })
    .from(resources)
    .where(
      and(eq(resources.authorId, user.id), eq(resources.isPublished, true))
    );

  return c.json({
    success: true,
    data: { ...user, resourceCount: total },
  });
});

// ── GET /api/users/:username/resources ──────────────────────
userRoutes.get("/:username/resources", async (c) => {
  const username = c.req.param("username");
  const page = Number(c.req.query("page") || 1);
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);
  const offset = (page - 1) * limit;

  // Find user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: resources.id,
        name: resources.name,
        description: resources.description,
        type: resources.type,
        tags: resources.tags,
        version: resources.version,
        downloads: resources.downloads,
        likes: resources.likes,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(
        and(eq(resources.authorId, user.id), eq(resources.isPublished, true))
      )
      .orderBy(desc(resources.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(resources)
      .where(
        and(eq(resources.authorId, user.id), eq(resources.isPublished, true))
      ),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ── GET /api/users/:id/stats ────────────────────────────────
userRoutes.get("/:id/stats", async (c) => {
  const id = c.req.param("id");

  const [user] = await db
    .select({ id: users.id, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  // Total downloads & likes across user's resources
  const [resourceStats] = await db
    .select({
      totalDownloads: sum(resources.downloads),
      totalLikes: sum(resources.likes),
    })
    .from(resources)
    .where(eq(resources.authorId, id));

  // Average rating across user's resources
  const [ratingStats] = await db
    .select({
      averageRating: avg(resourceRatings.rating),
    })
    .from(resourceRatings)
    .innerJoin(resources, eq(resourceRatings.resourceId, resources.id))
    .where(eq(resources.authorId, id));

  // Resource count
  const [{ resourceCount }] = await db
    .select({ resourceCount: count() })
    .from(resources)
    .where(and(eq(resources.authorId, id), eq(resources.isPublished, true)));

  const daysSinceJoining = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return c.json({
    success: true,
    data: {
      totalDownloads: Number(resourceStats.totalDownloads) || 0,
      totalLikes: Number(resourceStats.totalLikes) || 0,
      averageRating: Number(ratingStats.averageRating) || 0,
      resourceCount,
      daysSinceJoining,
    },
  });
});

// ── GET /api/users/:id/activity ─────────────────────────────
userRoutes.get("/:id/activity", async (c) => {
  const id = c.req.param("id");
  const limit = Math.min(Number(c.req.query("limit") || 20), 50);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  // Fetch recent activities from multiple tables in parallel
  const [recentResources, recentComments, recentLikes, recentFavorites] =
    await Promise.all([
      db
        .select({
          id: resources.id,
          title: resources.name,
          createdAt: resources.createdAt,
        })
        .from(resources)
        .where(eq(resources.authorId, id))
        .orderBy(desc(resources.createdAt))
        .limit(limit),
      db
        .select({
          id: resourceComments.id,
          title: resourceComments.content,
          resourceId: resourceComments.resourceId,
          createdAt: resourceComments.createdAt,
        })
        .from(resourceComments)
        .where(eq(resourceComments.userId, id))
        .orderBy(desc(resourceComments.createdAt))
        .limit(limit),
      db
        .select({
          id: resourceLikes.id,
          resourceId: resourceLikes.resourceId,
          title: resources.name,
          createdAt: resourceLikes.createdAt,
        })
        .from(resourceLikes)
        .innerJoin(resources, eq(resourceLikes.resourceId, resources.id))
        .where(eq(resourceLikes.userId, id))
        .orderBy(desc(resourceLikes.createdAt))
        .limit(limit),
      db
        .select({
          id: resourceFavorites.id,
          resourceId: resourceFavorites.resourceId,
          title: resources.name,
          createdAt: resourceFavorites.createdAt,
        })
        .from(resourceFavorites)
        .innerJoin(resources, eq(resourceFavorites.resourceId, resources.id))
        .where(eq(resourceFavorites.userId, id))
        .orderBy(desc(resourceFavorites.createdAt))
        .limit(limit),
    ]);

  // Merge and sort by time
  const activities = [
    ...recentResources.map((r) => ({
      type: "resource" as const,
      relatedId: r.id,
      title: r.title,
      createdAt: r.createdAt,
    })),
    ...recentComments.map((c) => ({
      type: "comment" as const,
      relatedId: c.resourceId,
      title: c.title.length > 100 ? c.title.slice(0, 100) + "..." : c.title,
      createdAt: c.createdAt,
    })),
    ...recentLikes.map((l) => ({
      type: "like" as const,
      relatedId: l.resourceId,
      title: l.title,
      createdAt: l.createdAt,
    })),
    ...recentFavorites.map((f) => ({
      type: "favorite" as const,
      relatedId: f.resourceId,
      title: f.title,
      createdAt: f.createdAt,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);

  return c.json({ success: true, data: activities });
});

// ── GET /api/users/:id/likes ────────────────────────────────
userRoutes.get("/:id/likes", async (c) => {
  const id = c.req.param("id");
  const page = Number(c.req.query("page") || 1);
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);
  const offset = (page - 1) * limit;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: resources.id,
        name: resources.name,
        description: resources.description,
        type: resources.type,
        tags: resources.tags,
        downloads: resources.downloads,
        likes: resources.likes,
        createdAt: resources.createdAt,
        likedAt: resourceLikes.createdAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(resourceLikes)
      .innerJoin(resources, eq(resourceLikes.resourceId, resources.id))
      .leftJoin(users, eq(resources.authorId, users.id))
      .where(eq(resourceLikes.userId, id))
      .orderBy(desc(resourceLikes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(resourceLikes)
      .where(eq(resourceLikes.userId, id)),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ── GET /api/users/:id/comments ─────────────────────────────
userRoutes.get("/:id/comments", async (c) => {
  const id = c.req.param("id");
  const page = Number(c.req.query("page") || 1);
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);
  const offset = (page - 1) * limit;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: resourceComments.id,
        content: resourceComments.content,
        createdAt: resourceComments.createdAt,
        resource: {
          id: resources.id,
          name: resources.name,
          type: resources.type,
        },
      })
      .from(resourceComments)
      .innerJoin(resources, eq(resourceComments.resourceId, resources.id))
      .where(eq(resourceComments.userId, id))
      .orderBy(desc(resourceComments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(resourceComments)
      .where(eq(resourceComments.userId, id)),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

export default userRoutes;
