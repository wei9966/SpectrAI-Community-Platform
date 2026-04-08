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
  resources,
  users,
  resourcePublishLog,
} from "../../db/schema.js";
import { authMiddleware, adminOrModerator, adminOnly } from "../../middleware/auth.js";

const adminResourceRoutes = new Hono();

// All routes require auth + admin/moderator
adminResourceRoutes.use("*", authMiddleware, adminOrModerator);

// ── Schemas ───────────────────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(["workflow", "team", "skill", "mcp"]).optional(),
  reviewStatus: z.enum(["draft", "pending", "approved", "rejected"]).optional(),
  sortBy: z.enum(["createdAt", "name", "downloads", "likes"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ── GET /api/admin/resources ──────────────────────────────────
adminResourceRoutes.get(
  "/",
  zValidator("query", listQuerySchema),
  async (c) => {
    const { page, limit, search, type, reviewStatus, sortBy, sortOrder } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(ilike(resources.name, `%${search}%`));
    }
    if (type) {
      conditions.push(eq(resources.type, type));
    }
    if (reviewStatus) {
      conditions.push(eq(resources.reviewStatus, reviewStatus));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderByCol =
      sortBy === "name"
        ? resources.name
        : sortBy === "downloads"
          ? resources.downloads
          : sortBy === "likes"
            ? resources.likes
            : resources.createdAt;
    const orderBy =
      sortOrder === "asc" ? asc(orderByCol) : desc(orderByCol);

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: resources.id,
          name: resources.name,
          description: resources.description,
          type: resources.type,
          reviewStatus: resources.reviewStatus,
          isPublished: resources.isPublished,
          downloads: resources.downloads,
          likes: resources.likes,
          version: resources.version,
          sourceApp: resources.sourceApp,
          tags: resources.tags,
          createdAt: resources.createdAt,
          updatedAt: resources.updatedAt,
          authorId: resources.authorId,
          authorUsername: users.username,
          authorAvatarUrl: users.avatarUrl,
        })
        .from(resources)
        .leftJoin(users, eq(resources.authorId, users.id))
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(resources).where(where),
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

// ── PUT /api/admin/resources/:id/publish ──────────────────────
// Force publish / unpublish
const publishSchema = z.object({
  publish: z.boolean(),
});

adminResourceRoutes.put(
  "/:id/publish",
  zValidator("json", publishSchema),
  async (c) => {
    const id = c.req.param("id") as string;
    const { publish } = c.req.valid("json");
    const user = c.get("user");

    const [resource] = await db
      .select({
        id: resources.id,
        isPublished: resources.isPublished,
        reviewStatus: resources.reviewStatus,
      })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!resource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    const previousStatus = resource.reviewStatus;

    await db
      .update(resources)
      .set({
        isPublished: publish,
        reviewStatus: publish ? "approved" : "draft",
        reviewedBy: user.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id));

    await db.insert(resourcePublishLog).values({
      resourceId: id,
      action: publish ? "admin_publish" : "admin_unpublish",
      previousStatus,
      newStatus: publish ? "approved" : "draft",
      note: publish ? "管理员强制上架" : "管理员下架",
      actorId: user.userId,
    });

    return c.json({
      success: true,
      message: publish ? "Resource published" : "Resource unpublished",
    });
  }
);

// ── DELETE /api/admin/resources/:id ───────────────────────────
adminResourceRoutes.delete("/:id", adminOnly, async (c) => {
  const id = c.req.param("id") as string;

  const [resource] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);

  if (!resource) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }

  await db.delete(resources).where(eq(resources.id, id));

  return c.json({ success: true, message: "Resource deleted" });
});

export { adminResourceRoutes };
