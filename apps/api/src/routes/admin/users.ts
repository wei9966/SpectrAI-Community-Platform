import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  eq,
  desc,
  asc,
  count,
  ilike,
  and,
  sql,
  sum,
  avg,
  isNotNull,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  users,
  resources,
  resourceLikes,
  resourceComments,
  forumPosts,
  forumReplies,
} from "../../db/schema.js";
import { authMiddleware, adminOnly, adminOrModerator } from "../../middleware/auth.js";

const adminUserRoutes = new Hono();

// All routes require auth + admin/moderator role
adminUserRoutes.use("*", authMiddleware, adminOrModerator);

// ── Schemas ───────────────────────────────────────────────────

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["user", "admin", "moderator"]).optional(),
  sortBy: z.enum(["createdAt", "username", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin", "moderator"]),
});

// ── GET /api/admin/users ──────────────────────────────────────
// List users with pagination, search, role filter
adminUserRoutes.get(
  "/",
  zValidator("query", listUsersQuerySchema),
  async (c) => {
    const { page, limit, search, role, sortBy, sortOrder } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${ilike(users.username, `%${search}%`)} OR ${ilike(users.email, `%${search}%`)})`
      );
    }
    if (role) {
      conditions.push(eq(users.role, role));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    const orderByColumn =
      sortBy === "username"
        ? users.username
        : sortBy === "email"
          ? users.email
          : users.createdAt;
    const orderBy =
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn);

    // Query in parallel
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          avatarUrl: users.avatarUrl,
          role: users.role,
          bio: users.bio,
          displayName: users.displayName,
          githubId: users.githubId,
          claudeopsUuid: users.claudeopsUuid,
          claudeopsPlan: users.claudeopsPlan,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]);

    // Fetch resource counts for listed users in bulk
    const userIds = items.map((u) => u.id);
    const resourceCounts =
      userIds.length > 0
        ? await db
            .select({
              authorId: resources.authorId,
              total: count(),
            })
            .from(resources)
            .where(
              sql`${resources.authorId} = ANY(${userIds})`
            )
            .groupBy(resources.authorId)
        : [];
    const resourceCountMap = new Map(
      resourceCounts.map((r) => [r.authorId, r.total])
    );

    const data = items.map((u) => ({
      ...u,
      resourceCount: resourceCountMap.get(u.id) ?? 0,
    }));

    return c.json({
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

// ── GET /api/admin/users/stats ────────────────────────────────
// User statistics overview (must be before /:id route)
adminUserRoutes.get("/stats", async (c) => {
  const [totalUsers] = await db.select({ total: count() }).from(users);

  const roleCounts = await db
    .select({ role: users.role, total: count() })
    .from(users)
    .groupBy(users.role);

  // Users registered in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ newUsers }] = await db
    .select({ newUsers: count() })
    .from(users)
    .where(sql`${users.createdAt} >= ${sevenDaysAgo}`);

  // Users with GitHub linked
  const [{ githubLinked }] = await db
    .select({ githubLinked: count() })
    .from(users)
    .where(isNotNull(users.githubId));

  // Users with ClaudeOps linked
  const [{ claudeopsLinked }] = await db
    .select({ claudeopsLinked: count() })
    .from(users)
    .where(isNotNull(users.claudeopsUuid));

  const byRole: Record<string, number> = {};
  for (const row of roleCounts) {
    byRole[row.role] = row.total;
  }

  return c.json({
    success: true,
    data: {
      total: totalUsers.total,
      byRole,
      newUsersLast7Days: newUsers,
      githubLinked,
      claudeopsLinked,
    },
  });
});

// ── GET /api/admin/users/:id ──────────────────────────────────
// Get user detail with activity stats
adminUserRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  // Get activity counts in parallel
  const [
    [{ resourceCount }],
    [{ commentCount }],
    [{ forumPostCount }],
    [{ forumReplyCount }],
    [resourceStats],
  ] = await Promise.all([
    db.select({ resourceCount: count() }).from(resources).where(eq(resources.authorId, id)),
    db.select({ commentCount: count() }).from(resourceComments).where(eq(resourceComments.userId, id)),
    db.select({ forumPostCount: count() }).from(forumPosts).where(eq(forumPosts.userId, id)),
    db.select({ forumReplyCount: count() }).from(forumReplies).where(eq(forumReplies.userId, id)),
    db
      .select({
        totalDownloads: sum(resources.downloads),
        totalLikes: sum(resources.likes),
      })
      .from(resources)
      .where(eq(resources.authorId, id)),
  ]);

  // Strip sensitive fields
  const { passwordHash, ...safeUser } = user;

  return c.json({
    success: true,
    data: {
      ...safeUser,
      stats: {
        resourceCount,
        commentCount,
        forumPostCount,
        forumReplyCount,
        totalDownloads: Number(resourceStats.totalDownloads) || 0,
        totalLikes: Number(resourceStats.totalLikes) || 0,
      },
    },
  });
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────
// Change user role (admin only)
adminUserRoutes.use("/:id/role", adminOnly);
adminUserRoutes.put(
  "/:id/role",
  zValidator("json", updateRoleSchema),
  async (c) => {
    const id = c.req.param("id");
    const { role } = c.req.valid("json");
    const currentUser = c.get("user");

    // Prevent self-demotion
    if (currentUser.userId === id && role !== "admin") {
      return c.json(
        { success: false, error: "Cannot change your own admin role" },
        400
      );
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));

    return c.json({ success: true, message: `User role updated to ${role}` });
  }
);

// ── DELETE /api/admin/users/:id ───────────────────────────────
// Delete user (admin only)
adminUserRoutes.use("/:id", adminOnly);
adminUserRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const currentUser = c.get("user");

    // Prevent self-deletion
    if (currentUser.userId === id) {
      return c.json({ success: false, error: "Cannot delete your own account" }, 400);
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // Cascade delete handled by DB foreign keys
    await db.delete(users).where(eq(users.id, id));

    return c.json({ success: true, message: "User deleted successfully" });
  }
);

export { adminUserRoutes };
