import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, asc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  resources,
  users,
  resourcePublishLog,
} from "../db/schema.js";

// Alias for users table when joining twice (author and reviewer)
const reviewers = users;
import { authMiddleware } from "../middleware/auth.js";
import { createNotification } from "../lib/notify.js";
import {
  reviewQueueParamsSchema,
  reviewDetailSchema,
  pendingReviewItemSchema,
  reviewQueueResponseSchema,
  approveReviewSchema,
  rejectReviewSchema,
} from "../../shared/src/schemas/review.schema.js";

// Validate UUID format helper
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reviewRoutes = new Hono();

// Admin/Moderator permission middleware
async function adminModeratorMiddleware(c: Parameters<typeof authMiddleware>[0], next: Parameters<typeof authMiddleware>[1]) {
  const user = c.get("user");
  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return c.json({ success: false, error: "Admin or moderator access required" }, 403);
  }
  await next();
}

// ── GET /api/admin/review/pending ────────────────────────────────
// Get pending review queue (admin/moderator only)
reviewRoutes.get(
  "/pending",
  adminModeratorMiddleware,
  zValidator("query", reviewQueueParamsSchema),
  async (c) => {
    const { page, limit, sortBy, sortOrder } = c.req.valid("query");
    const offset = (page - 1) * limit;

    // Build order by
    const orderByColumn =
      sortBy === "name"
        ? resources.name
        : sortBy === "updatedAt"
          ? resources.updatedAt
          : resources.createdAt;

    const orderBy = sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn);

    // Query pending resources
    const itemsResult = await db
      .select({
        id: resources.id,
        name: resources.name,
        description: resources.description,
        type: resources.type,
        reviewStatus: resources.reviewStatus,
        version: resources.version,
        createdAt: resources.createdAt,
        authorId: resources.authorId,
        authorUsername: users.username,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(resources)
      .leftJoin(users, eq(resources.authorId, users.id))
      .where(eq(resources.reviewStatus, "pending"))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Count total pending
    const [{ total }] = await db
      .select({
        total: count(),
      })
      .from(resources)
      .where(eq(resources.reviewStatus, "pending"));

    const items: z.infer<typeof pendingReviewItemSchema>[] = itemsResult.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      reviewStatus: row.reviewStatus as "pending",
      author: {
        id: row.authorId,
        username: row.authorUsername ?? "unknown",
        avatarUrl: row.authorAvatarUrl,
      },
      version: row.version,
      createdAt: row.createdAt,
    }));

    const response: z.infer<typeof reviewQueueResponseSchema> = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return c.json({ success: true, data: response });
  }
);

// ── GET /api/admin/review/:id ────────────────────────────────
// Get review detail by ID
reviewRoutes.get(
  "/:id",
  adminModeratorMiddleware,
  async (c) => {
    const resourceId = c.req.param("id");

    // Validate UUID format
    if (!uuidRegex.test(resourceId)) {
      return c.json({ success: false, error: "Invalid resource ID format" }, 400);
    }

    // Get resource with author info
    const [resource] = await db
      .select({
        id: resources.id,
        name: resources.name,
        description: resources.description,
        type: resources.type,
        content: resources.content,
        reviewStatus: resources.reviewStatus,
        reviewNote: resources.reviewNote,
        reviewedBy: resources.reviewedBy,
        reviewedAt: resources.reviewedAt,
        sourceApp: resources.sourceApp,
        isPublished: resources.isPublished,
        version: resources.version,
        downloads: resources.downloads,
        likes: resources.likes,
        tags: resources.tags,
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
        authorId: resources.authorId,
        authorUsername: users.username,
        authorAvatarUrl: users.avatarUrl,
        reviewedById: reviewers.id,
        reviewedByUsername: reviewers.username,
        reviewedByAvatarUrl: reviewers.avatarUrl,
      })
      .from(resources)
      .leftJoin(users, eq(resources.authorId, users.id))
      .leftJoin(reviewers, eq(resources.reviewedBy, reviewers.id))
      .where(eq(resources.id, resourceId));

    if (!resource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    // Get publish log history
    const publishLog = await db
      .select({
        id: resourcePublishLog.id,
        resourceId: resourcePublishLog.resourceId,
        action: resourcePublishLog.action,
        previousStatus: resourcePublishLog.previousStatus,
        newStatus: resourcePublishLog.newStatus,
        note: resourcePublishLog.note,
        actorId: resourcePublishLog.actorId,
        createdAt: resourcePublishLog.createdAt,
      })
      .from(resourcePublishLog)
      .where(eq(resourcePublishLog.resourceId, resourceId))
      .orderBy(desc(resourcePublishLog.createdAt));

    const reviewDetail: z.infer<typeof reviewDetailSchema> = {
      id: resource.id,
      name: resource.name,
      description: resource.description,
      type: resource.type,
      reviewStatus: resource.reviewStatus as "draft" | "pending" | "approved" | "rejected",
      reviewNote: resource.reviewNote,
      reviewedBy: resource.reviewedBy,
      reviewedByUser: resource.reviewedById
        ? {
            id: resource.reviewedById,
            username: resource.reviewedByUsername ?? "unknown",
            avatarUrl: resource.reviewedByAvatarUrl,
          }
        : null,
      reviewedAt: resource.reviewedAt,
      author: {
        id: resource.authorId,
        username: resource.authorUsername ?? "unknown",
        avatarUrl: resource.authorAvatarUrl,
      },
      publishLog: publishLog.map((log) => ({
        id: log.id,
        resourceId: log.resourceId,
        action: log.action as "approve" | "reject",
        previousStatus: log.previousStatus as "draft" | "pending" | "approved" | "rejected" | null,
        newStatus: log.newStatus as "draft" | "pending" | "approved" | "rejected",
        note: log.note,
        executedBy: log.actorId ?? "system",
        executedAt: log.createdAt,
      })),
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };

    return c.json({ success: true, data: reviewDetail });
  }
);

// ── POST /api/admin/review/:id/approve ────────────────────────────────
// Approve a resource
reviewRoutes.post(
  "/:id/approve",
  adminModeratorMiddleware,
  zValidator("json", approveReviewSchema),
  async (c) => {
    const resourceId = c.req.param("id");

    // Validate UUID format
    if (!uuidRegex.test(resourceId)) {
      return c.json({ success: false, error: "Invalid resource ID format" }, 400);
    }

    const currentUser = c.get("user");

    // Get current resource state
    const [currentResource] = await db
      .select({
        reviewStatus: resources.reviewStatus,
        authorId: resources.authorId,
      })
      .from(resources)
      .where(eq(resources.id, resourceId));

    if (!currentResource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    const previousStatus = currentResource.reviewStatus;

    // Update resource
    await db
      .update(resources)
      .set({
        reviewStatus: "approved",
        isPublished: true,
        reviewedBy: currentUser.userId,
        reviewedAt: new Date(),
      })
      .where(eq(resources.id, resourceId));

    // Write to publish log
    await db.insert(resourcePublishLog).values({
      resourceId,
      action: "approve",
      previousStatus,
      newStatus: "approved",
      note: null,
      actorId: currentUser.userId,
    });

    // Create notification for author
    await createNotification({
      type: "resource_approved",
      fromUserId: currentUser.userId,
      toUserId: currentResource.authorId,
      title: "资源审核通过",
      content: "您提交的资源已通过审核，现在可以对其他用户可见。",
      relatedId: resourceId,
      relatedType: "resource",
    });

    return c.json({
      success: true,
      message: "Resource approved successfully",
    });
  }
);

// ── POST /api/admin/review/:id/reject ────────────────────────────────
// Reject a resource
reviewRoutes.post(
  "/:id/reject",
  adminModeratorMiddleware,
  zValidator("json", rejectReviewSchema),
  async (c) => {
    const resourceId = c.req.param("id");

    // Validate UUID format
    if (!uuidRegex.test(resourceId)) {
      return c.json({ success: false, error: "Invalid resource ID format" }, 400);
    }

    const { note } = c.req.valid("json");
    const currentUser = c.get("user");

    // Get current resource state
    const [currentResource] = await db
      .select({
        reviewStatus: resources.reviewStatus,
        authorId: resources.authorId,
      })
      .from(resources)
      .where(eq(resources.id, resourceId));

    if (!currentResource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    const previousStatus = currentResource.reviewStatus;

    // Update resource
    await db
      .update(resources)
      .set({
        reviewStatus: "rejected",
        reviewNote: note,
        reviewedBy: currentUser.userId,
        reviewedAt: new Date(),
      })
      .where(eq(resources.id, resourceId));

    // Write to publish log
    await db.insert(resourcePublishLog).values({
      resourceId,
      action: "reject",
      previousStatus,
      newStatus: "rejected",
      note,
      actorId: currentUser.userId,
    });

    // Create notification for author with rejection reason
    await createNotification({
      type: "resource_rejected",
      fromUserId: currentUser.userId,
      toUserId: currentResource.authorId,
      title: "资源审核驳回",
      content: `您提交的资源未通过审核。驳回理由：${note}`,
      relatedId: resourceId,
      relatedType: "resource",
    });

    return c.json({
      success: true,
      message: "Resource rejected successfully",
    });
  }
);

export { reviewRoutes };
