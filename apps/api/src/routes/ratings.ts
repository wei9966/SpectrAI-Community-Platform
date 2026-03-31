import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, and, avg, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { resources, resourceRatings } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { createNotification } from "../lib/notify.js";

const ratingRoutes = new Hono();

// ── Validation ──────────────────────────────────────────────
const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

// ── POST /:id/rate — upsert rating (1-5 stars) ─────────────
ratingRoutes.post(
  "/:id/rate",
  authMiddleware,
  zValidator("json", rateSchema),
  async (c) => {
    const resourceId = c.req.param("id")!;
    const { userId } = c.get("user");
    const { rating } = c.req.valid("json");

    // Check resource exists (include authorId for notification)
    const [resource] = await db
      .select({ id: resources.id, authorId: resources.authorId, name: resources.name })
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!resource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    // Upsert: check if user already rated
    const [existing] = await db
      .select()
      .from(resourceRatings)
      .where(
        and(
          eq(resourceRatings.resourceId, resourceId),
          eq(resourceRatings.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(resourceRatings)
        .set({ rating, updatedAt: new Date() })
        .where(eq(resourceRatings.id, existing.id));
    } else {
      await db
        .insert(resourceRatings)
        .values({ resourceId, userId, rating });
    }

    // Return updated stats
    const [stats] = await db
      .select({
        averageRating: avg(resourceRatings.rating),
        ratingCount: count(),
      })
      .from(resourceRatings)
      .where(eq(resourceRatings.resourceId, resourceId));

    // Notify resource author about the rating
    if (resource.authorId) {
      createNotification({
        type: "rating",
        fromUserId: userId,
        toUserId: resource.authorId,
        title: `你的资源「${resource.name}」收到了 ${rating} 星评分`,
        relatedId: resourceId,
        relatedType: "resource",
      });
    }

    return c.json({
      success: true,
      data: {
        rating,
        averageRating: Number(stats.averageRating) || 0,
        ratingCount: stats.ratingCount,
      },
    });
  }
);

export default ratingRoutes;
