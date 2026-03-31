import { Hono } from "hono";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { resources, resourceFavorites, users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { createNotification } from "../lib/notify.js";

const favoriteRoutes = new Hono();

// ── POST /:id/favorite — toggle favorite ────────────────────
favoriteRoutes.post("/:id/favorite", authMiddleware, async (c) => {
  const resourceId = c.req.param("id")!;
  const { userId } = c.get("user");

  // Check resource exists (include authorId + name for notification)
  const [resource] = await db
    .select({ id: resources.id, authorId: resources.authorId, name: resources.name })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }

  // Toggle: check if already favorited
  const [existing] = await db
    .select()
    .from(resourceFavorites)
    .where(
      and(
        eq(resourceFavorites.resourceId, resourceId),
        eq(resourceFavorites.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .delete(resourceFavorites)
      .where(eq(resourceFavorites.id, existing.id));
    return c.json({ success: true, data: { favorited: false } });
  } else {
    await db
      .insert(resourceFavorites)
      .values({ resourceId, userId });

    // Notify resource author on favorite (not on unfavorite)
    if (resource.authorId) {
      createNotification({
        type: "favorite",
        fromUserId: userId,
        toUserId: resource.authorId,
        title: `有人收藏了你的资源「${resource.name}」`,
        relatedId: resourceId,
        relatedType: "resource",
      });
    }

    return c.json({ success: true, data: { favorited: true } });
  }
});

export default favoriteRoutes;

// ── User favorites list — mounted at /api/users ─────────────
export const userFavoriteRoutes = new Hono();

userFavoriteRoutes.get("/:id/favorites", async (c) => {
  const id = c.req.param("id");
  const page = Number(c.req.query("page") || 1);
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);
  const offset = (page - 1) * limit;

  // Check user exists
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
        favoritedAt: resourceFavorites.createdAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(resourceFavorites)
      .innerJoin(resources, eq(resourceFavorites.resourceId, resources.id))
      .leftJoin(users, eq(resources.authorId, users.id))
      .where(eq(resourceFavorites.userId, id))
      .orderBy(desc(resourceFavorites.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(resourceFavorites)
      .where(eq(resourceFavorites.userId, id)),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});
