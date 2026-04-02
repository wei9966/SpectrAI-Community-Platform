import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  deserialize,
  detectDesktopResourceType,
} from "../lib/format-converter.js";
import { publishRequestSchema } from "@spectrai-community/shared";
import { resources, resourcePublishLog } from "../db/schema.js";

const publishRoutes = new Hono();

// ── POST /api/resources/publish ─────────────────────────────────
// Publish a resource from ClaudeOps desktop app to community
publishRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", publishRequestSchema),
  async (c) => {
    const { userId } = c.get("user");
    const body = c.req.valid("json");
    const { resource, metadata } = body;

    // Detect resource type
    const resourceType = detectDesktopResourceType(resource);

    // Convert desktop format to community format
    const communityContent = deserialize(resource, resourceType);

    // Insert resource with pending review status
    const [newResource] = await db
      .insert(resources)
      .values({
        name: communityContent.name,
        description: communityContent.description,
        type: resourceType,
        content: communityContent as any,
        authorId: userId,
        reviewStatus: "pending",
        sourceApp: metadata?.sourceApp || "desktop",
        isPublished: false,
      })
      .returning();

    // Log the publish action
    await db.insert(resourcePublishLog).values({
      resourceId: newResource.id,
      action: "publish",
      actorId: userId,
      note: `Published from ${metadata?.sourceApp || "desktop"}`,
    });

    return c.json(
      {
        success: true,
        data: {
          id: newResource.id,
          name: newResource.name,
          type: newResource.type,
          reviewStatus: newResource.reviewStatus,
          sourceApp: newResource.sourceApp,
          createdAt: newResource.createdAt,
        },
      },
      201
    );
  }
);

export default publishRoutes;
