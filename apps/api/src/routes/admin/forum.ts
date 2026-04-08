import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  eq,
  desc,
  asc,
  count,
  ilike,
  sql,
  and,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  forumPosts,
  forumReplies,
  forumCategories,
  users,
} from "../../db/schema.js";
import { authMiddleware, adminOrModerator, adminOnly } from "../../middleware/auth.js";

const adminForumRoutes = new Hono();

// All routes require auth + admin/moderator
adminForumRoutes.use("*", authMiddleware, adminOrModerator);

// ── Schemas ───────────────────────────────────────────────────

const listPostsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isPinned: z.enum(["true", "false"]).optional(),
  isLocked: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["createdAt", "title", "viewCount", "replyCount", "voteScore"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
});

// ── GET /api/admin/forum/posts ───────────────────────────────
adminForumRoutes.get(
  "/posts",
  zValidator("query", listPostsSchema),
  async (c) => {
    const { page, limit, search, categoryId, isPinned, isLocked, sortBy, sortOrder } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(ilike(forumPosts.title, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(forumPosts.categoryId, categoryId));
    }
    if (isPinned !== undefined) {
      conditions.push(eq(forumPosts.isPinned, isPinned === "true"));
    }
    if (isLocked !== undefined) {
      conditions.push(eq(forumPosts.isLocked, isLocked === "true"));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderByCol =
      sortBy === "title"
        ? forumPosts.title
        : sortBy === "viewCount"
          ? forumPosts.viewCount
          : sortBy === "replyCount"
            ? forumPosts.replyCount
            : sortBy === "voteScore"
              ? forumPosts.voteScore
              : forumPosts.createdAt;
    const orderByDir = sortOrder === "asc" ? asc(orderByCol) : desc(orderByCol);

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: forumPosts.id,
          title: forumPosts.title,
          categoryId: forumPosts.categoryId,
          categoryName: forumCategories.name,
          userId: forumPosts.userId,
          username: users.username,
          avatarUrl: users.avatarUrl,
          isPinned: forumPosts.isPinned,
          isLocked: forumPosts.isLocked,
          viewCount: forumPosts.viewCount,
          replyCount: forumPosts.replyCount,
          voteScore: forumPosts.voteScore,
          tags: forumPosts.tags,
          createdAt: forumPosts.createdAt,
          updatedAt: forumPosts.updatedAt,
        })
        .from(forumPosts)
        .leftJoin(users, eq(forumPosts.userId, users.id))
        .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
        .where(where)
        .orderBy(orderByDir)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(forumPosts).where(where),
    ]);

    return c.json({
      success: true,
      data: {
        items,
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

// ── PUT /api/admin/forum/posts/:id/pin ───────────────────────
adminForumRoutes.put(
  "/posts/:id/pin",
  zValidator("json", z.object({ pinned: z.boolean() })),
  async (c) => {
    const id = c.req.param("id") as string;
    const { pinned } = c.req.valid("json");

    const [post] = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, id))
      .limit(1);

    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }

    await db
      .update(forumPosts)
      .set({ isPinned: pinned, updatedAt: new Date() })
      .where(eq(forumPosts.id, id));

    return c.json({
      success: true,
      data: { message: pinned ? "帖子已置顶" : "帖子已取消置顶" },
    });
  }
);

// ── PUT /api/admin/forum/posts/:id/lock ──────────────────────
adminForumRoutes.put(
  "/posts/:id/lock",
  zValidator("json", z.object({ locked: z.boolean() })),
  async (c) => {
    const id = c.req.param("id") as string;
    const { locked } = c.req.valid("json");

    const [post] = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, id))
      .limit(1);

    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }

    await db
      .update(forumPosts)
      .set({ isLocked: locked, updatedAt: new Date() })
      .where(eq(forumPosts.id, id));

    return c.json({
      success: true,
      data: { message: locked ? "帖子已锁定" : "帖子已解锁" },
    });
  }
);

// ── DELETE /api/admin/forum/posts/:id ────────────────────────
adminForumRoutes.delete("/posts/:id", adminOnly, async (c) => {
  const id = c.req.param("id") as string;

  const [post] = await db
    .select({ id: forumPosts.id })
    .from(forumPosts)
    .where(eq(forumPosts.id, id))
    .limit(1);

  if (!post) {
    return c.json({ success: false, error: "Post not found" }, 404);
  }

  await db.delete(forumPosts).where(eq(forumPosts.id, id));

  return c.json({ success: true, data: { message: "帖子已删除" } });
});

// ── GET /api/admin/forum/categories ──────────────────────────
adminForumRoutes.get("/categories", async (c) => {
  const categories = await db
    .select({
      id: forumCategories.id,
      name: forumCategories.name,
      slug: forumCategories.slug,
      description: forumCategories.description,
      icon: forumCategories.icon,
      sortOrder: forumCategories.sortOrder,
      createdAt: forumCategories.createdAt,
      postCount: sql<number>`(SELECT COUNT(*) FROM forum_posts WHERE category_id = ${forumCategories.id})`.as("post_count"),
    })
    .from(forumCategories)
    .orderBy(asc(forumCategories.sortOrder));

  return c.json({ success: true, data: categories });
});

// ── POST /api/admin/forum/categories ─────────────────────────
adminForumRoutes.post(
  "/categories",
  adminOnly,
  zValidator("json", createCategorySchema),
  async (c) => {
    const body = c.req.valid("json");

    // Check slug uniqueness
    const [existing] = await db
      .select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.slug, body.slug))
      .limit(1);

    if (existing) {
      return c.json({ success: false, error: "Slug already exists" }, 409);
    }

    const [category] = await db
      .insert(forumCategories)
      .values({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        icon: body.icon || null,
        sortOrder: body.sortOrder,
      })
      .returning();

    return c.json({ success: true, data: category }, 201);
  }
);

// ── PUT /api/admin/forum/categories/:id ──────────────────────
adminForumRoutes.put(
  "/categories/:id",
  adminOnly,
  zValidator("json", updateCategorySchema),
  async (c) => {
    const id = c.req.param("id") as string;
    const body = c.req.valid("json");

    const [existing] = await db
      .select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Category not found" }, 404);
    }

    // Check slug uniqueness if slug is being changed
    if (body.slug) {
      const [conflict] = await db
        .select({ id: forumCategories.id })
        .from(forumCategories)
        .where(and(eq(forumCategories.slug, body.slug), sql`${forumCategories.id} != ${id}`))
        .limit(1);

      if (conflict) {
        return c.json({ success: false, error: "Slug already exists" }, 409);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(forumCategories)
      .set(updateData)
      .where(eq(forumCategories.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  }
);

// ── DELETE /api/admin/forum/categories/:id ───────────────────
adminForumRoutes.delete("/categories/:id", adminOnly, async (c) => {
  const id = c.req.param("id") as string;

  // Check if category has posts
  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(forumPosts)
    .where(eq(forumPosts.categoryId, id));

  if (postCount > 0) {
    return c.json(
      { success: false, error: `该分类下有 ${postCount} 个帖子，无法删除` },
      400
    );
  }

  const [category] = await db
    .select({ id: forumCategories.id })
    .from(forumCategories)
    .where(eq(forumCategories.id, id))
    .limit(1);

  if (!category) {
    return c.json({ success: false, error: "Category not found" }, 404);
  }

  await db.delete(forumCategories).where(eq(forumCategories.id, id));

  return c.json({ success: true, data: { message: "分类已删除" } });
});

export { adminForumRoutes };
