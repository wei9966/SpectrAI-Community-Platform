import { Hono } from "hono";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const notificationRoutes = new Hono();

// ── GET / — list current user's notifications ────────────────
notificationRoutes.get("/", authMiddleware, async (c) => {
  const { userId } = c.get("user");
  const page = Number(c.req.query("page") || 1);
  const limit = Math.min(Number(c.req.query("limit") || 20), 100);
  const offset = (page - 1) * limit;
  const unreadOnly = c.req.query("unread") === "true";

  const baseCondition = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId);

  const [items, [{ total }], [{ unreadCount }]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        content: notifications.content,
        relatedId: notifications.relatedId,
        relatedType: notifications.relatedType,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        from: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(baseCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(notifications)
      .where(baseCondition),
    db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      ),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ── PATCH /:id/read — mark single notification as read ───────
notificationRoutes.patch("/:id/read", authMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const { userId } = c.get("user");

  const [notif] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1);

  if (!notif) {
    return c.json({ success: false, error: "Notification not found" }, 404);
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));

  return c.json({ success: true, data: { message: "Marked as read" } });
});

// ── PATCH /read-all — mark all notifications as read ─────────
notificationRoutes.patch("/read-all", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return c.json({ success: true, data: { message: "All marked as read" } });
});

// ── DELETE /:id — delete a notification ──────────────────────
notificationRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const { userId } = c.get("user");

  const [notif] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1);

  if (!notif) {
    return c.json({ success: false, error: "Notification not found" }, 404);
  }

  await db.delete(notifications).where(eq(notifications.id, id));

  return c.json({ success: true, data: { message: "Notification deleted" } });
});

export default notificationRoutes;
