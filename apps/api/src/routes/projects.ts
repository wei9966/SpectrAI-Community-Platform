import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, and, sql, ilike, or, count } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  projects,
  projectResources,
  resources,
  users,
} from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const projectRoutes = new Hono();

// ── Validation schemas ──────────────────────────────────────
const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  coverImage: z.string().max(500).optional(),
  demoUrl: z.string().max(500).optional(),
  sourceUrl: z.string().max(500).optional(),
  toolChain: z.any().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  coverImage: z.string().max(500).optional().nullable(),
  demoUrl: z.string().max(500).optional().nullable(),
  sourceUrl: z.string().max(500).optional().nullable(),
  toolChain: z.any().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "published", "archived"]).optional(),
  q: z.string().optional(),
  userId: z.string().uuid().optional(),
});

const linkResourceSchema = z.object({
  resourceId: z.string().uuid(),
});

// ── GET /api/projects ───────────────────────────────────────
projectRoutes.get("/", async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { page, limit, status, q, userId } = query;
  const offset = (page - 1) * limit;

  const conditions = [];
  // Default: only published unless filtered
  if (status) {
    conditions.push(eq(projects.status, status));
  } else {
    conditions.push(eq(projects.status, "published"));
  }
  if (userId) {
    conditions.push(eq(projects.userId, userId));
  }
  if (q) {
    conditions.push(
      or(
        ilike(projects.title, `%${q}%`),
        ilike(projects.description, `%${q}%`)
      )!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        coverImage: projects.coverImage,
        demoUrl: projects.demoUrl,
        sourceUrl: projects.sourceUrl,
        toolChain: projects.toolChain,
        tags: projects.tags,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(projects)
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

// ── GET /api/projects/:id ───────────────────────────────────
projectRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      coverImage: projects.coverImage,
      demoUrl: projects.demoUrl,
      sourceUrl: projects.sourceUrl,
      toolChain: projects.toolChain,
      tags: projects.tags,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) {
    return c.json({ success: false, error: "Project not found" }, 404);
  }

  // Fetch linked resources
  const linkedResources = await db
    .select({
      id: resources.id,
      name: resources.name,
      description: resources.description,
      type: resources.type,
      tags: resources.tags,
      downloads: resources.downloads,
      likes: resources.likes,
    })
    .from(projectResources)
    .innerJoin(resources, eq(projectResources.resourceId, resources.id))
    .where(eq(projectResources.projectId, id));

  return c.json({
    success: true,
    data: { ...project, resources: linkedResources },
  });
});

// ── POST /api/projects ──────────────────────────────────────
projectRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", createProjectSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { userId } = c.get("user");

    const [project] = await db
      .insert(projects)
      .values({
        ...body,
        userId,
      })
      .returning();

    return c.json({ success: true, data: project }, 201);
  }
);

// ── PUT /api/projects/:id ───────────────────────────────────
projectRoutes.put(
  "/:id",
  authMiddleware,
  zValidator("json", updateProjectSchema),
  async (c) => {
    const id = c.req.param("id")!;
    const { userId } = c.get("user");
    const body = c.req.valid("json");

    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    if (existing.userId !== userId) {
      return c.json(
        { success: false, error: "Not authorized to update this project" },
        403
      );
    }

    const [updated] = await db
      .update(projects)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  }
);

// ── DELETE /api/projects/:id ────────────────────────────────
projectRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const { userId, role } = c.get("user");

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: "Project not found" }, 404);
  }
  if (existing.userId !== userId && role !== "admin") {
    return c.json(
      { success: false, error: "Not authorized to delete this project" },
      403
    );
  }

  await db.delete(projects).where(eq(projects.id, id));
  return c.json({ success: true, data: { message: "Project deleted" } });
});

// ── POST /api/projects/:id/resources ────────────────────────
projectRoutes.post(
  "/:id/resources",
  authMiddleware,
  zValidator("json", linkResourceSchema),
  async (c) => {
    const projectId = c.req.param("id")!;
    const { userId } = c.get("user");
    const { resourceId } = c.req.valid("json");

    // Check project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    if (project.userId !== userId) {
      return c.json({ success: false, error: "Not authorized" }, 403);
    }

    // Check resource exists
    const [resource] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!resource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }

    // Check if already linked
    const [existingLink] = await db
      .select()
      .from(projectResources)
      .where(
        and(
          eq(projectResources.projectId, projectId),
          eq(projectResources.resourceId, resourceId)
        )
      )
      .limit(1);

    if (existingLink) {
      return c.json(
        { success: false, error: "Resource already linked to this project" },
        409
      );
    }

    const [link] = await db
      .insert(projectResources)
      .values({ projectId, resourceId })
      .returning();

    return c.json({ success: true, data: link }, 201);
  }
);

// ── DELETE /api/projects/:id/resources/:resourceId ──────────
projectRoutes.delete(
  "/:id/resources/:resourceId",
  authMiddleware,
  async (c) => {
    const projectId = c.req.param("id")!;
    const resourceId = c.req.param("resourceId")!;
    const { userId } = c.get("user");

    // Check project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    if (project.userId !== userId) {
      return c.json({ success: false, error: "Not authorized" }, 403);
    }

    const [link] = await db
      .select()
      .from(projectResources)
      .where(
        and(
          eq(projectResources.projectId, projectId),
          eq(projectResources.resourceId, resourceId)
        )
      )
      .limit(1);

    if (!link) {
      return c.json({ success: false, error: "Link not found" }, 404);
    }

    await db
      .delete(projectResources)
      .where(eq(projectResources.id, link.id));

    return c.json({
      success: true,
      data: { message: "Resource unlinked from project" },
    });
  }
);

export default projectRoutes;
