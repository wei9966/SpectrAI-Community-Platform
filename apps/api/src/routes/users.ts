import { Hono } from "hono";
import { eq, desc, count, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, resources } from "../db/schema.js";
import type { ApiResponse } from "../types/shared.js";

const userRoutes = new Hono();

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

export default userRoutes;
