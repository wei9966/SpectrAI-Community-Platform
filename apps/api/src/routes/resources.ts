import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  eq,
  desc,
  and,
  sql,
  ilike,
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
import {
  generateInstallUrl,
  computeContentChecksum,
} from "../lib/deep-link.js";

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
  sourceApp: z.string().optional(),
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

  const conditions = [eq(resources.isPublished, true), eq(resources.reviewStatus, "approved")];
  if (type) {
    conditions.push(eq(resources.type, type));
  }
  if (q) {
    // 使用 coalesce 处理 NULL 值，确保搜索健壮
    conditions.push(
      sql`(${resources.name} ILIKE ${`%${q}%`} OR ${resources.description} ILIKE ${`%${q}%`})`
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

// ── Desktop content adapter ────────────────────────────────
/**
 * Adapt community content format to desktop-expected format for installation.
 */
function adaptContentForDesktop(type: string, content: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'skill': {
      // 桌面端期望 systemPromptAddition 独立字段
      // 社区格式合并在 promptTemplate 里，提取 system prompt 部分
      const pt = String(content.promptTemplate || '');
      const systemPattern = /^(You are|System:|\[System\]|## System|## Role).*\n+/i;
      const match = pt.match(systemPattern);
      return {
        ...content,
        systemPromptAddition: match ? match[0].trim() : '',
        promptTemplate: match ? pt.slice(match[0].length).trim() : pt,
      };
    }
    case 'mcp': {
      return {
        ...content,
        installCommand: content.installCommand || '',
      };
    }
    case 'workflow': {
      // 桌面端期望 orchestrationConfig: { steps: OrchestrationStep[], mergeStrategy }
      const steps = (content.steps as Array<Record<string, unknown>>) || [];
      return {
        ...content,
        orchestrationConfig: {
          steps: steps.map((s: any) => ({
            name: String(s.name || ''),
            providerId: String(s.config?.providerId || 'claude-code'),
            promptTemplate: String(s.config?.promptTemplate || ''),
            dependsOn: s.config?.dependsOn || undefined,
            timeout: s.config?.timeout || undefined,
          })),
          mergeStrategy: String((content as any).mergeStrategy || 'concatenate'),
        },
      };
    }
    case 'team': {
      // 桌面端期望 roles: [{ roleName, displayName, systemPrompt, providerId, color, sortOrder }]
      const roles = (content.roles as Array<Record<string, unknown>>) || [];
      return {
        ...content,
        roles: roles.map((r: any, i: number) => ({
          roleName: String(r.name || r.roleName || ''),
          displayName: String(r.displayName || r.name || ''),
          systemPrompt: String(r.systemPrompt || r.description || ''),
          providerId: String(r.providerId || 'claude-code'),
          color: String(r.color || '#6366f1'),
          sortOrder: Number(r.sortOrder ?? i),
        })),
      };
    }
    default:
      return content;
  }
}

// ── GET /api/resources/:id/install-manifest ────────────────
resourceRoutes.get("/:id/install-manifest", optionalAuthMiddleware, async (c) => {
  const id = c.req.param("id")!;

  // Fetch the resource — must be published and approved
  const [resource] = await db
    .select({
      id: resources.id,
      name: resources.name,
      type: resources.type,
      content: resources.content,
      version: resources.version,
      isPublished: resources.isPublished,
      reviewStatus: resources.reviewStatus,
      createdAt: resources.createdAt,
      author: {
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(resources)
    .leftJoin(users, eq(resources.authorId, users.id))
    .where(eq(resources.id, id))
    .limit(1);

  if (!resource || !resource.isPublished || resource.reviewStatus !== "approved") {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }

  // Resolve dependencies for workflow resources
  const dependencies = await resolveDependencies(resource.type, resource.content);

  const installUrl = generateInstallUrl(resource.type, resource.id, resource.version);
  const checksum = computeContentChecksum(resource.content);

  // Note: install-manifest does NOT increment downloads (only GET /:id does)
  return c.json({
    success: true,
    data: {
      id: resource.id,
      type: resource.type,
      name: resource.name,
      version: resource.version,
      content: adaptContentForDesktop(resource.type, resource.content as Record<string, unknown>),
      author: resource.author,
      dependencies,
      installUrl,
      createdAt: resource.createdAt,
      checksum,
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
        isPublished: true, // 发布时立即设置为已发布
        sourceApp: body.sourceApp || "web",
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

// ── Dependency resolution for workflows ──────────────────────
async function resolveDependencies(
  resourceType: string,
  content: unknown
): Promise<Array<{ type: string; id: string; name: string; version: string; installUrl: string }>> {
  if (resourceType !== "workflow" || !content || typeof content !== "object") {
    return [];
  }

  const workflowContent = content as { steps?: Array<{ type: string; config?: Record<string, unknown> }> };
  if (!workflowContent.steps || !Array.isArray(workflowContent.steps)) {
    return [];
  }

  // Collect referenced resource IDs from workflow steps
  const referencedIds: string[] = [];
  const stepTypes = new Map<string, string>(); // id -> type

  for (const step of workflowContent.steps) {
    if (step.type === "skill_invoke" && step.config?.skillId && typeof step.config.skillId === "string") {
      referencedIds.push(step.config.skillId);
      stepTypes.set(step.config.skillId, "skill");
    } else if (step.type === "mcp_call" && step.config?.mcpId && typeof step.config.mcpId === "string") {
      referencedIds.push(step.config.mcpId);
      stepTypes.set(step.config.mcpId, "mcp");
    }
  }

  if (referencedIds.length === 0) {
    return [];
  }

  // Look up matching published & approved resources
  const matchedResources = await db
    .select({
      id: resources.id,
      name: resources.name,
      type: resources.type,
      version: resources.version,
    })
    .from(resources)
    .where(
      and(
        sql`${resources.id} = ANY(${referencedIds})`,
        eq(resources.isPublished, true),
        eq(resources.reviewStatus, "approved")
      )
    );

  return matchedResources.map((r) => ({
    type: r.type,
    id: r.id,
    name: r.name,
    version: r.version,
    installUrl: generateInstallUrl(r.type, r.id, r.version),
  }));
}

export default resourceRoutes;
