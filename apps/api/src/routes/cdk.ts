import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { getRedis } from "../lib/redis.js";
import { spendCredits, transferCredits } from "../lib/credit-service.js";
import { CDK_PLATFORM_FEE_RATE } from "../db/seed-credits.js";
import { createNotification } from "../lib/notify.js";

const cdkRoutes = new Hono();

const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["pro_trial", "mobile_access", "api_key", "resource", "custom"]).optional(),
});

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  type: z.enum(["pro_trial", "mobile_access", "api_key", "resource", "custom"]),
  creditPrice: z.coerce.number().int().min(0),
  isActive: z.boolean().optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  type: z.enum(["pro_trial", "mobile_access", "api_key", "resource", "custom"]).optional(),
  creditPrice: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const importItemsSchema = z.object({
  codes: z.array(z.string().min(1)).min(1).max(500),
  expiresAt: z.string().datetime().optional(),
});

const redeemSchema = z.object({
  projectId: z.string().uuid(),
});

function asRows<T>(result: unknown): T[] {
  return result as T[];
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function hashCode(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function previewCode(value: string): string {
  const normalized = value.trim();
  const head = normalized.slice(0, 4).toUpperCase();
  return `${head}${normalized.length > 4 ? "****" : ""}`;
}

function getRedisKey(projectId: string): string {
  return `cdk:project:${projectId}:codes`;
}

async function getTrustLevel(userId: string): Promise<number> {
  const rows = asRows<{ level: number | string }>(
    await db.execute(sql`
      SELECT level
      FROM trust_levels
      WHERE user_id = ${userId}
      LIMIT 1
    `)
  );

  return toNumber(rows[0]?.level);
}

cdkRoutes.get(
  "/projects",
  zValidator("query", projectListQuerySchema),
  async (c) => {
    const { page, limit, type } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const whereClause = type
      ? sql`WHERE p.is_active = true AND p.type = ${type}`
      : sql`WHERE p.is_active = true`;

    const items = asRows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT
          p.id,
          p.title,
          p.description,
          p.type,
          p.credit_price AS "creditPrice",
          p.stock,
          p.distributed,
          p.is_active AS "isActive",
          p.created_at AS "createdAt",
          u.id AS "creatorId",
          u.username AS "creatorUsername"
        FROM cdk_projects p
        JOIN users u ON u.id = p.creator_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `)
    );

    const totalRows = asRows<{ total: number | string }>(
      await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM cdk_projects p
        ${whereClause}
      `)
    );

    const total = toNumber(totalRows[0]?.total);

    return c.json({
      success: true,
      data: {
        items: items.map((item) => ({
          ...item,
          creditPrice: toNumber(item.creditPrice as number | string),
          stock: toNumber(item.stock as number | string),
          distributed: toNumber(item.distributed as number | string),
          isActive: Boolean(item.isActive),
        })),
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

cdkRoutes.get("/projects/:id", async (c) => {
  const id = c.req.param("id");

  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        p.id,
        p.title,
        p.description,
        p.type,
        p.credit_price AS "creditPrice",
        p.stock,
        p.distributed,
        p.is_active AS "isActive",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        u.id AS "creatorId",
        u.username AS "creatorUsername"
      FROM cdk_projects p
      JOIN users u ON u.id = p.creator_id
      WHERE p.id = ${id}
      LIMIT 1
    `)
  );

  const project = rows[0];

  if (!project) {
    return c.json({ success: false, error: "CDK project not found" }, 404);
  }

  return c.json({
    success: true,
    data: {
      ...project,
      creditPrice: toNumber(project.creditPrice as number | string),
      stock: toNumber(project.stock as number | string),
      distributed: toNumber(project.distributed as number | string),
      isActive: Boolean(project.isActive),
    },
  });
});

cdkRoutes.post(
  "/projects",
  authMiddleware,
  zValidator("json", createProjectSchema),
  async (c) => {
    const { userId, role } = c.get("user");
    const body = c.req.valid("json");
    const trustLevel = role === "admin" ? 4 : await getTrustLevel(userId);

    if (trustLevel < 2) {
      return c.json({ success: false, error: "L2 trust level required" }, 403);
    }

    const rows = asRows<Record<string, unknown>>(
      await db.execute(sql`
        INSERT INTO cdk_projects (
          creator_id,
          title,
          description,
          type,
          credit_price,
          is_active
        )
        VALUES (
          ${userId},
          ${body.title},
          ${body.description ?? null},
          ${body.type},
          ${body.creditPrice},
          ${body.isActive ?? true}
        )
        RETURNING
          id,
          title,
          description,
          type,
          credit_price AS "creditPrice",
          stock,
          distributed,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `)
    );

    return c.json({ success: true, data: rows[0] }, 201);
  }
);

cdkRoutes.put(
  "/projects/:id",
  authMiddleware,
  zValidator("json", updateProjectSchema),
  async (c) => {
    const { userId, role } = c.get("user");
    const projectId = c.req.param("id");
    const body = c.req.valid("json");

    const projectRows = asRows<{ creator_id: string }>(
      await db.execute(sql`
        SELECT creator_id
        FROM cdk_projects
        WHERE id = ${projectId}
        LIMIT 1
      `)
    );

    const project = projectRows[0];

    if (!project) {
      return c.json({ success: false, error: "CDK project not found" }, 404);
    }

    if (project.creator_id !== userId && role !== "admin") {
      return c.json({ success: false, error: "Not authorized" }, 403);
    }

    const rows = asRows<Record<string, unknown>>(
      await db.execute(sql`
        UPDATE cdk_projects
        SET
          title = COALESCE(${body.title ?? null}, title),
          description = COALESCE(${body.description ?? null}, description),
          type = COALESCE(${body.type ?? null}, type),
          credit_price = COALESCE(${body.creditPrice ?? null}, credit_price),
          is_active = COALESCE(${body.isActive ?? null}, is_active),
          updated_at = now()
        WHERE id = ${projectId}
        RETURNING
          id,
          title,
          description,
          type,
          credit_price AS "creditPrice",
          stock,
          distributed,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `)
    );

    return c.json({ success: true, data: rows[0] });
  }
);

cdkRoutes.post(
  "/projects/:id/items",
  authMiddleware,
  zValidator("json", importItemsSchema),
  async (c) => {
    const { userId, role } = c.get("user");
    const projectId = c.req.param("id");
    const { codes, expiresAt } = c.req.valid("json");
    const trustLevel = role === "admin" ? 4 : await getTrustLevel(userId);
    const batchLimit = trustLevel >= 4 ? Number.POSITIVE_INFINITY : trustLevel >= 3 ? 100 : 10;

    if (trustLevel < 2) {
      return c.json({ success: false, error: "L2 trust level required" }, 403);
    }

    if (codes.length > batchLimit) {
      return c.json({ success: false, error: `Current trust level allows up to ${batchLimit} items per batch` }, 400);
    }

    const projectRows = asRows<{ creator_id: string }>(
      await db.execute(sql`
        SELECT creator_id
        FROM cdk_projects
        WHERE id = ${projectId}
        LIMIT 1
      `)
    );

    const project = projectRows[0];

    if (!project) {
      return c.json({ success: false, error: "CDK project not found" }, 404);
    }

    if (project.creator_id !== userId && role !== "admin") {
      return c.json({ success: false, error: "Not authorized" }, 403);
    }

    const normalizedCodes = Array.from(
      new Set(codes.map((item) => item.trim()).filter(Boolean))
    );

    if (normalizedCodes.length === 0) {
      return c.json({ success: false, error: "No valid codes to import" }, 400);
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

    await db.transaction(async (tx) => {
      const values = normalizedCodes.map((item) =>
        sql`(
          ${projectId},
          ${hashCode(item)},
          ${previewCode(item)},
          'available',
          ${expiresAtDate}
        )`
      );

      await tx.execute(sql`
        INSERT INTO cdk_items (
          project_id,
          code_hash,
          code_preview,
          status,
          expires_at
        )
        VALUES ${sql.join(values, sql`, `)}
      `);

      await tx.execute(sql`
        UPDATE cdk_projects
        SET stock = stock + ${normalizedCodes.length},
            updated_at = now()
        WHERE id = ${projectId}
      `);
    });

    let queued = true;
    try {
      if (normalizedCodes.length > 0) {
        await getRedis().rpush(getRedisKey(projectId), ...normalizedCodes);
      }
    } catch {
      queued = false;
    }

    return c.json({
      success: true,
      data: {
        imported: normalizedCodes.length,
        queuedInRedis: queued,
      },
    });
  }
);

cdkRoutes.post(
  "/redeem",
  authMiddleware,
  zValidator("json", redeemSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { projectId } = c.req.valid("json");
    const redis = getRedis();
    const redisKey = getRedisKey(projectId);
    const reservedCode = await redis.lpop(redisKey);

    if (!reservedCode) {
      return c.json({ success: false, error: "CDK stock is empty" }, 400);
    }

    const codeHash = hashCode(reservedCode);

    try {
      const result = await db.transaction(async (tx) => {
        const projectRows = asRows<Record<string, unknown>>(
          await tx.execute(sql`
            SELECT
              id,
              creator_id AS "creatorId",
              title,
              credit_price AS "creditPrice",
              is_active AS "isActive"
            FROM cdk_projects
            WHERE id = ${projectId}
            LIMIT 1
            FOR UPDATE
          `)
        );

        const project = projectRows[0];

        if (!project || !project.isActive) {
          throw new Error("CDK project is unavailable");
        }

        const itemRows = asRows<Record<string, unknown>>(
          await tx.execute(sql`
            SELECT id, code_preview AS "codePreview", status
            FROM cdk_items
            WHERE project_id = ${projectId}
              AND code_hash = ${codeHash}
            LIMIT 1
            FOR UPDATE
          `)
        );

        const item = itemRows[0];

        if (!item || item.status !== "available") {
          throw new Error("Failed to reserve CDK item");
        }

        if (project.creatorId === userId) {
          await spendCredits(
            userId,
            toNumber(project.creditPrice as number | string),
            "cdk_redeem",
            projectId,
            "cdk_project",
            `兑换自己的 CDK 项目：${String(project.title)}`,
            tx
          );
        } else {
          await transferCredits(
            userId,
            String(project.creatorId),
            toNumber(project.creditPrice as number | string),
            CDK_PLATFORM_FEE_RATE,
            {
              action: "cdk_redeem",
              refId: projectId,
              refType: "cdk_project",
              note: `兑换 CDK 项目：${String(project.title)}`,
              executor: tx,
            }
          );
        }

        await tx.execute(sql`
          UPDATE cdk_items
          SET status = 'redeemed',
              redeemed_by = ${userId},
              redeemed_at = now()
          WHERE id = ${String(item.id)}
        `);

        await tx.execute(sql`
          INSERT INTO cdk_redemptions (
            item_id,
            user_id,
            project_id,
            credit_cost
          )
          VALUES (
            ${String(item.id)},
            ${userId},
            ${projectId},
            ${toNumber(project.creditPrice as number | string)}
          )
        `);

        await tx.execute(sql`
          UPDATE cdk_projects
          SET stock = GREATEST(stock - 1, 0),
              distributed = distributed + 1,
              updated_at = now()
          WHERE id = ${projectId}
        `);

        return {
          projectId,
          projectTitle: project.title,
          code: reservedCode,
          codePreview: item.codePreview,
          creditCost: toNumber(project.creditPrice as number | string),
        };
      });

      const detailRows = asRows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT creator_id AS "creatorId"
          FROM cdk_projects
          WHERE id = ${projectId}
          LIMIT 1
        `)
      );

      const creatorId = detailRows[0]?.creatorId;
      if (creatorId && creatorId !== userId) {
        createNotification({
          type: "cdk_redeemed",
          fromUserId: userId,
          toUserId: String(creatorId),
          title: "你的 CDK 项目被兑换了",
          content: String(result.projectTitle),
          relatedId: projectId,
          relatedType: "cdk_project",
        });
      }

      return c.json({ success: true, data: result });
    } catch (error) {
      await redis.rpush(redisKey, reservedCode);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Redeem failed",
        },
        400
      );
    }
  }
);

cdkRoutes.get("/my/projects", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        id,
        title,
        description,
        type,
        credit_price AS "creditPrice",
        stock,
        distributed,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cdk_projects
      WHERE creator_id = ${userId}
      ORDER BY created_at DESC
    `)
  );

  return c.json({ success: true, data: rows });
});

cdkRoutes.get("/my/redeemed", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        r.id,
        r.credit_cost AS "creditCost",
        r.redeemed_at AS "redeemedAt",
        i.code_preview AS "codePreview",
        p.id AS "projectId",
        p.title AS "projectTitle",
        p.type AS "projectType"
      FROM cdk_redemptions r
      JOIN cdk_items i ON i.id = r.item_id
      JOIN cdk_projects p ON p.id = r.project_id
      WHERE r.user_id = ${userId}
      ORDER BY r.redeemed_at DESC
    `)
  );

  return c.json({ success: true, data: rows });
});

export default cdkRoutes;
