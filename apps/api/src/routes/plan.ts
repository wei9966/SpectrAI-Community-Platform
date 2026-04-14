import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { spendCredits } from "../lib/credit-service.js";
import { PLAN_CREDIT_PRICING } from "../db/seed-credits.js";

const planRoutes = new Hono();

const exchangeSchema = z.object({
  plan: z.enum(["pro", "team"]),
});

const activateCdkSchema = z.object({
  code: z.string().min(4).max(128),
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

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function resolvePlanFromProject(
  type: string,
  title: string,
  description: string | null
): { plan: "pro" | "team" | "community_vip"; durationDays: number } | null {
  const content = `${title} ${description ?? ""}`.toLowerCase();

  if (type === "pro_trial") {
    return {
      plan: "community_vip",
      durationDays: PLAN_CREDIT_PRICING.community_vip.durationDays,
    };
  }

  if (content.includes("team")) {
    return { plan: "team", durationDays: PLAN_CREDIT_PRICING.team.durationDays };
  }

  if (content.includes("pro")) {
    return { plan: "pro", durationDays: PLAN_CREDIT_PRICING.pro.durationDays };
  }

  return null;
}

async function activatePlan(
  userId: string,
  plan: "pro" | "team" | "community_vip",
  source: "credit" | "cdk",
  durationDays: number
): Promise<{ plan: string; startsAt: Date; expiresAt: Date }> {
  return db.transaction(async (tx) => {
    const startsAt = new Date();
    const expiresAt = addDays(durationDays);

    await tx.execute(sql`
      UPDATE plan_subscriptions
      SET is_active = false
      WHERE user_id = ${userId}
        AND is_active = true
    `);

    await tx.execute(sql`
      INSERT INTO plan_subscriptions (
        user_id,
        plan,
        source,
        starts_at,
        expires_at,
        is_active
      )
      VALUES (
        ${userId},
        ${plan},
        ${source},
        ${startsAt},
        ${expiresAt},
        true
      )
    `);

    await tx.execute(sql`
      UPDATE users
      SET claudeops_plan = ${plan},
          updated_at = now()
      WHERE id = ${userId}
    `);

    return { plan, startsAt, expiresAt };
  });
}

planRoutes.post(
  "/exchange",
  authMiddleware,
  zValidator("json", exchangeSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { plan } = c.req.valid("json");
    const pricing = PLAN_CREDIT_PRICING[plan];

    try {
      const result = await db.transaction(async (tx) => {
        await spendCredits(
          userId,
          pricing.credits,
          "plan_exchange",
          undefined,
          "plan",
          `积分兑换 ${plan} 会员`,
          tx
        );

        const startsAt = new Date();
        const expiresAt = addDays(pricing.durationDays);

        await tx.execute(sql`
          UPDATE plan_subscriptions
          SET is_active = false
          WHERE user_id = ${userId}
            AND is_active = true
        `);

        await tx.execute(sql`
          INSERT INTO plan_subscriptions (
            user_id,
            plan,
            source,
            starts_at,
            expires_at,
            is_active
          )
          VALUES (
            ${userId},
            ${plan},
            'credit',
            ${startsAt},
            ${expiresAt},
            true
          )
        `);

        await tx.execute(sql`
          UPDATE users
          SET claudeops_plan = ${plan},
              updated_at = now()
          WHERE id = ${userId}
        `);

        return { plan, startsAt, expiresAt, creditsSpent: pricing.credits };
      });

      return c.json({ success: true, data: result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Plan exchange failed",
        },
        400
      );
    }
  }
);

planRoutes.get("/status", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        COALESCE(ps.plan, COALESCE(u.claudeops_plan, 'free')) AS plan,
        ps.source,
        ps.starts_at AS "startsAt",
        ps.expires_at AS "expiresAt",
        ps.is_active AS "isActive"
      FROM users u
      LEFT JOIN LATERAL (
        SELECT plan, source, starts_at, expires_at, is_active
        FROM plan_subscriptions
        WHERE user_id = ${userId}
          AND is_active = true
          AND expires_at > now()
        ORDER BY expires_at DESC
        LIMIT 1
      ) ps ON true
      WHERE u.id = ${userId}
      LIMIT 1
    `)
  );

  const current = rows[0] ?? {
    plan: "free",
    source: null,
    startsAt: null,
    expiresAt: null,
    isActive: false,
  };

  return c.json({
    success: true,
    data: {
      plan: current.plan ?? "free",
      source: current.source ?? null,
      startsAt: current.startsAt ?? null,
      expiresAt: current.expiresAt ?? null,
      isActive: Boolean(current.isActive),
    },
  });
});

planRoutes.post(
  "/activate-cdk",
  authMiddleware,
  zValidator("json", activateCdkSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { code } = c.req.valid("json");
    const codeHash = createHash("sha256").update(code.trim()).digest("hex");

    try {
      const result = await db.transaction(async (tx) => {
        const itemRows = asRows<Record<string, unknown>>(
          await tx.execute(sql`
            SELECT
              i.id,
              i.project_id AS "projectId",
              i.status,
              i.redeemed_by AS "redeemedBy",
              p.type,
              p.title,
              p.description,
              p.stock,
              p.distributed
            FROM cdk_items i
            JOIN cdk_projects p ON p.id = i.project_id
            WHERE i.code_hash = ${codeHash}
            LIMIT 1
            FOR UPDATE
          `)
        );

        const item = itemRows[0];

        if (!item) {
          throw new Error("CDK code not found");
        }

        const planConfig = resolvePlanFromProject(
          String(item.type),
          String(item.title),
          item.description ? String(item.description) : null
        );

        if (!planConfig) {
          throw new Error("This CDK cannot activate a membership plan");
        }

        if (item.status === "redeemed" && item.redeemedBy !== userId) {
          throw new Error("This CDK has already been redeemed by another user");
        }

        const redemptionRows = asRows<{ id: string }>(
          await tx.execute(sql`
            SELECT id
            FROM cdk_redemptions
            WHERE item_id = ${String(item.id)}
              AND user_id = ${userId}
            LIMIT 1
          `)
        );

        if (item.status !== "redeemed") {
          await tx.execute(sql`
            UPDATE cdk_items
            SET status = 'redeemed',
                redeemed_by = ${userId},
                redeemed_at = now()
            WHERE id = ${String(item.id)}
          `);

          if (!redemptionRows[0]) {
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
                ${String(item.projectId)},
                0
              )
            `);
          }

          await tx.execute(sql`
            UPDATE cdk_projects
            SET stock = GREATEST(stock - 1, 0),
                distributed = distributed + 1,
                updated_at = now()
            WHERE id = ${String(item.projectId)}
          `);
        }

        const startsAt = new Date();
        const expiresAt = addDays(planConfig.durationDays);

        await tx.execute(sql`
          UPDATE plan_subscriptions
          SET is_active = false
          WHERE user_id = ${userId}
            AND is_active = true
        `);

        await tx.execute(sql`
          INSERT INTO plan_subscriptions (
            user_id,
            plan,
            source,
            starts_at,
            expires_at,
            is_active
          )
          VALUES (
            ${userId},
            ${planConfig.plan},
            'cdk',
            ${startsAt},
            ${expiresAt},
            true
          )
        `);

        await tx.execute(sql`
          UPDATE users
          SET claudeops_plan = ${planConfig.plan},
              updated_at = now()
          WHERE id = ${userId}
        `);

        return {
          plan: planConfig.plan,
          startsAt,
          expiresAt,
          projectId: item.projectId,
          projectTitle: item.title,
        };
      });

      return c.json({ success: true, data: result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "CDK activation failed",
        },
        400
      );
    }
  }
);

planRoutes.get("/history", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        id,
        plan,
        source,
        starts_at AS "startsAt",
        expires_at AS "expiresAt",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM plan_subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `)
  );

  return c.json({ success: true, data: rows });
});

export default planRoutes;
