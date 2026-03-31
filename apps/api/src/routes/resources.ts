import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  eq,
  desc,
  and,
  sql,
  ilike,
  or,
  count,
} from "drizzle-orm";
import { db } from "../db/index.js";
import type { ApiResponse, ResourceType } from "../types/shared.js";
import {
  resources,
  users,
  resourceLikes,
  resourceComments,
} from "../db/schema.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";

const resourceRoutes = new Hono();

// ── Validation schemas ──────────────────────────────────────
const createResourceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["workflow", "team", "skill", "mcp"]),
  content: z.any().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const updateResourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  content: z.any().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["workflow", "team", "skill", "mcp"]).optional(),
  sort: z.enum(["latest", "popular", "downloads", "rating"]).default("latest"),
  q: z.string().optional(),
});

// ── GET /api/resources ──────────────────────────────────────
resourceRoutes.get("/", optionalAuthMiddleware, async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { page, limit, type, sort, q } = query;
  const offset = (page - 1) * limit;
  const currentUserId: string | undefined = c.get("user")?.userId;

  const conditions = [eq(resources.isPublished, true)];
  if (type) {
    conditions.push(eq(resources.type, type));
  }
  if (q) {
    conditions.push(
      or(
        ilike(resources.name, `%${q}%`),
        ilike(resources.description, `%${q}%`)
      )!
    );
  }
  const where = and(...conditions);

  const avgRatingSql = sql<number>`COALESCE((SELECT AVG(rating)::numeric(3,2) FROM resource_ratings WHERE resource_id = ${resources.id}), 0)`;

  const orderBy =
    sort === "popular"
      ? desc(resources.likes)
      : sort === "downloads"
        ? desc(resources.downloads)
        : sort === "rating"
          ? desc(avgRatingSql)
          : desc(resources.createdAt);

  const isFavoritedSql = currentUserId
    ? sql<boolean>`EXISTS(SELECT 1 FROM resource_favorites WHERE resource_id = ${resources.id} AND user_id = ${currentUserId})`
    : sql<boolean>`false`;

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
        isPublished: resources.isPublished,
        createdAt: resources.createdAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
        averageRating: avgRatingSql,
        ratingCount: sql<number>`(SELECT COUNT(*)::int FROM resource_ratings WHERE resource_id = ${resources.id})`,
        isFavorited: isFavoritedSql,
      })
      .from(resources)
      .leftJoin(users, eq(resources.authorId, users.id))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(resources)
      .where(where),
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
});

// ── GET /api/resources/search ───────────────────────────────
resourceRoutes.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ success: false, error: "Search query is required" }, 400);
  }
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);

  // PostgreSQL full-text search
  const results = await db
    .select({
      id: resources.id,
      name: resources.name,
      description: resources.description,
      type: resources.type,
      tags: resources.tags,
      downloads: resources.downloads,
      likes: resources.likes,
      createdAt: resources.createdAt,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
      rank: sql<number>`ts_rank(
        to_tsvector('english', coalesce(${resources.name}, '') || ' ' || coalesce(${resources.description}, '')),
        plainto_tsquery('english', ${q})
      )`.as("rank"),
    })
    .from(resources)
    .leftJoin(users, eq(resources.authorId, users.id))
    .where(
      and(
        eq(resources.isPublished, true),
        sql`to_tsvector('english', coalesce(${resources.name}, '') || ' ' || coalesce(${resources.description}, ''))
            @@ plainto_tsquery('english', ${q})`
      )
    )
    .orderBy(sql`rank DESC`)
    .limit(limit);

  return c.json({ success: true, data: results });
});

// ── GET /api/resources/:id ──────────────────────────────────
resourceRoutes.get("/:id", optionalAuthMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const currentUserId: string | undefined = c.get("user")?.userId;

  const isFavoritedSql = currentUserId
    ? sql<boolean>`EXISTS(SELECT 1 FROM resource_favorites WHERE resource_id = ${resources.id} AND user_id = ${currentUserId})`
    : sql<boolean>`false`;

  const userRatingSql = currentUserId
    ? sql<number | null>`(SELECT rating FROM resource_ratings WHERE resource_id = ${resources.id} AND user_id = ${currentUserId} LIMIT 1)`
    : sql<number | null>`NULL`;

  const [resource] = await db
    .select({
      id: resources.id,
      name: resources.name,
      description: resources.description,
      type: resources.type,
      content: resources.content,
      tags: resources.tags,
      version: resources.version,
      downloads: resources.downloads,
      likes: resources.likes,
      isPublished: resources.isPublished,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
      },
      averageRating: sql<number>`COALESCE((SELECT AVG(rating)::numeric(3,2) FROM resource_ratings WHERE resource_id = ${resources.id}), 0)`,
      ratingCount: sql<number>`(SELECT COUNT(*)::int FROM resource_ratings WHERE resource_id = ${resources.id})`,
      isFavorited: isFavoritedSql,
      userRating: userRatingSql,
    })
    .from(resources)
    .leftJoin(users, eq(resources.authorId, users.id))
    .where(eq(resources.id, id))
    .limit(1);

  if (!resource) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }

  // Increment download count
  await db
    .update(resources)
    .set({ downloads: sql`${resources.downloads} + 1` })
    .where(eq(resources.id, id));

  return c.json({ success: true, data: resource });
});

// ── GET /api/resources/:id/install-manifest ─────────────────
resourceRoutes.get("/:id/install-manifest", async (c) => {
  const id = c.req.param("id")!;

  const [resource] = await db
    .select({
      id: resources.id,
      name: resources.name,
      type: resources.type,
      version: resources.version,
      content: resources.content,
      isPublished: resources.isPublished,
    })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);

  if (!resource) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }

  if (!resource.isPublished) {
    return c.json({ success: false, error: "Resource is not published" }, 403);
  }

  return c.json({
    success: true,
    data: {
      type: resource.type,
      name: resource.name,
      version: resource.version,
      installUrl: `spectrai://install/${resource.type}/${resource.id}`,
      content: resource.content,
    },
  });
});

// ── POST /api/resources ─────────────────────────────────────
resourceRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", createResourceSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { userId } = c.get("user");

    const [resource] = await db
      .insert(resources)
      .values({
        ...body,
        authorId: userId,
      })
      .returning();

    return c.json({ success: true, data: resource }, 201);
  }
);

// ── PUT /api/resources/:id ──────────────────────────────────
resourceRoutes.put(
  "/:id",
  authMiddleware,
  zValidator("json", updateResourceSchema),
  async (c) => {
    const id = c.req.param("id")!;
    const { userId } = c.get("user");
    const body = c.req.valid("json");

    // Check ownership
    const [existing] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }
    if (existing.authorId !== userId) {
      return c.json(
        { success: false, error: "Not authorized to update this resource" },
        403
      );
    }

    const [updated] = await db
      .update(resources)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  }
);

// ── DELETE /api/resources/:id ───────────────────────────────
resourceRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const { userId, role } = c.get("user");

  const [existing] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }
  if (existing.authorId !== userId && role !== "admin") {
    return c.json(
      { success: false, error: "Not authorized to delete this resource" },
      403
    );
  }

  await db.delete(resources).where(eq(resources.id, id));
  return c.json({ success: true, data: { message: "Resource deleted" } });
});

// ── POST /api/resources/:id/like ────────────────────────────
resourceRoutes.post("/:id/like", authMiddleware, async (c) => {
  const resourceId = c.req.param("id")!;
  const { userId } = c.get("user");

  // Check resource exists
  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }

  // Toggle like
  const [existingLike] = await db
    .select()
    .from(resourceLikes)
    .where(
      and(
        eq(resourceLikes.resourceId, resourceId),
        eq(resourceLikes.userId, userId)
      )
    )
    .limit(1);

  if (existingLike) {
    // Unlike
    await db
      .delete(resourceLikes)
      .where(eq(resourceLikes.id, existingLike.id));
    await db
      .update(resources)
      .set({ likes: sql`${resources.likes} - 1` })
      .where(eq(resources.id, resourceId));
    return c.json({ success: true, data: { liked: false } });
  } else {
    // Like
    await db
      .insert(resourceLikes)
      .values({ resourceId, userId });
    await db
      .update(resources)
      .set({ likes: sql`${resources.likes} + 1` })
      .where(eq(resources.id, resourceId));
    return c.json({ success: true, data: { liked: true } });
  }
});

// ── GET /api/resources/:id/comments ─────────────────────────
resourceRoutes.get("/:id/comments", async (c) => {
  const resourceId = c.req.param("id")!;
  const page = Number(c.req.query("page") || 1);
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);
  const offset = (page - 1) * limit;

  const [comments, [{ total }]] = await Promise.all([
    db
      .select({
        id: resourceComments.id,
        content: resourceComments.content,
        createdAt: resourceComments.createdAt,
        user: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(resourceComments)
      .leftJoin(users, eq(resourceComments.userId, users.id))
      .where(eq(resourceComments.resourceId, resourceId))
      .orderBy(desc(resourceComments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(resourceComments)
      .where(eq(resourceComments.resourceId, resourceId)),
  ]);

  return c.json({
    success: true,
    data: {
      items: comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ── POST /api/resources/:id/comments ────────────────────────
resourceRoutes.post(
  "/:id/comments",
  authMiddleware,
  zValidator("json", z.object({ content: z.string().min(1).max(2000) })),
  async (c) => {
    const resourceId = c.req.param("id")!;
    const { userId } = c.get("user");
    const { content } = c.req.valid("json");

    // Check resource exists
    const [resource] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!resource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    const [comment] = await db
      .insert(resourceComments)
      .values({ resourceId, userId, content })
      .returning();

    return c.json({ success: true, data: comment }, 201);
  }
);

export default resourceRoutes;
