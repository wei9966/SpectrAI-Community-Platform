import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import jwt from "jsonwebtoken";
const { verify } = jwt;
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { getEnv } from "../config/env.js";
import { spendCredits } from "../lib/credit-service.js";
import { calculateCostUsd, SUPPORTED_MODELS } from "../lib/token-pricing.js";
import { CREDITS_PER_DOLLAR } from "../db/seed-credits.js";

const tokenQuotaRoutes = new Hono();

interface ClaudeOpsAccessPayload {
  sub: string;
  type: "access";
  plan: string;
}

const exchangeSchema = z.object({
  creditAmount: z.coerce.number().int().min(1),
});

const consumeSchema = z.object({
  model: z.string().min(1),
  tokens_in: z.coerce.number().int().min(0),
  tokens_out: z.coerce.number().int().min(0),
  session_id: z.string().max(100).optional(),
  cost_usd: z.coerce.number().optional(),
});

const usageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
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

function getClaudeOpsSecret(): string {
  const env = getEnv();
  return env.CLAUDEOPS_JWT_SECRET || env.JWT_SECRET;
}

tokenQuotaRoutes.get("/", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<{
    balance_usd: number | string | null;
    lifetime_used: number | string | null;
  }>(
    await db.execute(sql`
      SELECT balance_usd, lifetime_used
      FROM token_quotas
      WHERE user_id = ${userId}
      LIMIT 1
    `)
  );

  const quota = rows[0];

  return c.json({
    success: true,
    data: {
      balanceUsd: Number(toNumber(quota?.balance_usd).toFixed(4)),
      lifetimeUsed: Number(toNumber(quota?.lifetime_used).toFixed(4)),
      creditsPerDollar: CREDITS_PER_DOLLAR,
    },
  });
});

tokenQuotaRoutes.post(
  "/exchange",
  authMiddleware,
  zValidator("json", exchangeSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { creditAmount } = c.req.valid("json");
    const usdAmount = creditAmount / CREDITS_PER_DOLLAR;

    try {
      const result = await db.transaction(async (tx) => {
        await spendCredits(
          userId,
          creditAmount,
          "token_exchange",
          undefined,
          "token_quota",
          `兑换 $${usdAmount.toFixed(4)} token 额度`,
          tx
        );

        const rows = asRows<{
          balance_usd: number | string;
          lifetime_used: number | string;
        }>(
          await tx.execute(sql`
            INSERT INTO token_quotas (user_id, balance_usd, lifetime_used)
            VALUES (${userId}, ${usdAmount}, 0)
            ON CONFLICT (user_id)
            DO UPDATE SET
              balance_usd = token_quotas.balance_usd + ${usdAmount},
              updated_at = now()
            RETURNING balance_usd, lifetime_used
          `)
        );

        return rows[0];
      });

      return c.json({
        success: true,
        data: {
          exchangedCredits: creditAmount,
          balanceUsd: Number(toNumber(result?.balance_usd).toFixed(4)),
          lifetimeUsed: Number(toNumber(result?.lifetime_used).toFixed(4)),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Exchange failed",
        },
        400
      );
    }
  }
);

tokenQuotaRoutes.post(
  "/consume",
  zValidator("json", consumeSchema),
  async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    const token = authHeader.slice(7);

    let payload: ClaudeOpsAccessPayload;
    try {
      const decoded = verify(token, getClaudeOpsSecret(), { algorithms: ["HS256"] });
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        (decoded as Record<string, unknown>).type !== "access" ||
        typeof (decoded as Record<string, unknown>).sub !== "string"
      ) {
        return c.json({ success: false, error: "SpectrAI access token required" }, 401);
      }
      payload = decoded as unknown as ClaudeOpsAccessPayload;
    } catch {
      return c.json({ success: false, error: "Invalid or expired token" }, 401);
    }

    const userRows = asRows<{ id: string }>(
      await db.execute(sql`
        SELECT id
        FROM users
        WHERE claudeops_uuid = ${payload.sub}
        LIMIT 1
      `)
    );

    const user = userRows[0];

    if (!user) {
      return c.json({ success: false, error: "ClaudeOps account not linked" }, 403);
    }

    const body = c.req.valid("json");

    let costUsd: number;
    try {
      costUsd = calculateCostUsd(body.model, body.tokens_in, body.tokens_out);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unsupported model",
        },
        400
      );
    }

    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`
          INSERT INTO token_quotas (user_id)
          VALUES (${user.id})
          ON CONFLICT (user_id) DO NOTHING
        `);

        const quotaRows = asRows<{
          balance_usd: number | string;
          lifetime_used: number | string;
        }>(
          await tx.execute(sql`
            SELECT balance_usd, lifetime_used
            FROM token_quotas
            WHERE user_id = ${user.id}
            FOR UPDATE
          `)
        );

        const quota = quotaRows[0];

        if (toNumber(quota?.balance_usd) < costUsd) {
          throw new Error("Insufficient token quota balance");
        }

        const updatedRows = asRows<{
          balance_usd: number | string;
          lifetime_used: number | string;
        }>(
          await tx.execute(sql`
            UPDATE token_quotas
            SET balance_usd = balance_usd - ${costUsd},
                lifetime_used = lifetime_used + ${costUsd},
                updated_at = now()
            WHERE user_id = ${user.id}
            RETURNING balance_usd, lifetime_used
          `)
        );

        await tx.execute(sql`
          INSERT INTO token_usage_logs (
            user_id,
            model,
            tokens_in,
            tokens_out,
            cost_usd,
            session_id
          )
          VALUES (
            ${user.id},
            ${body.model},
            ${body.tokens_in},
            ${body.tokens_out},
            ${costUsd},
            ${body.session_id ?? null}
          )
        `);

        return updatedRows[0];
      });

      return c.json({
        success: true,
        data: {
          costUsd,
          balanceUsd: Number(toNumber(result?.balance_usd).toFixed(4)),
          lifetimeUsed: Number(toNumber(result?.lifetime_used).toFixed(4)),
          model: body.model,
          tokensIn: body.tokens_in,
          tokensOut: body.tokens_out,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Consume failed",
        },
        400
      );
    }
  }
);

tokenQuotaRoutes.get(
  "/usage",
  authMiddleware,
  zValidator("query", usageQuerySchema),
  async (c) => {
    const { userId } = c.get("user");
    const { days } = c.req.valid("query");

    const byModelRows = asRows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT
          model,
          COUNT(*)::int AS count,
          COALESCE(SUM(tokens_in), 0)::int AS "tokensIn",
          COALESCE(SUM(tokens_out), 0)::int AS "tokensOut",
          COALESCE(SUM(cost_usd), 0)::numeric(10,6) AS "costUsd"
        FROM token_usage_logs
        WHERE user_id = ${userId}
          AND created_at >= now() - (${days} * interval '1 day')
        GROUP BY model
        ORDER BY "costUsd" DESC
      `)
    );

    const byDayRows = asRows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS count,
          COALESCE(SUM(tokens_in), 0)::int AS "tokensIn",
          COALESCE(SUM(tokens_out), 0)::int AS "tokensOut",
          COALESCE(SUM(cost_usd), 0)::numeric(10,6) AS "costUsd"
        FROM token_usage_logs
        WHERE user_id = ${userId}
          AND created_at >= now() - (${days} * interval '1 day')
        GROUP BY day
        ORDER BY day DESC
      `)
    );

    return c.json({
      success: true,
      data: {
        days,
        byModel: byModelRows.map((row) => ({
          model: row.model,
          count: toNumber(row.count as number | string),
          tokensIn: toNumber(row.tokensIn as number | string),
          tokensOut: toNumber(row.tokensOut as number | string),
          costUsd: Number(toNumber(row.costUsd as number | string).toFixed(6)),
        })),
        byDay: byDayRows.map((row) => ({
          day: row.day,
          count: toNumber(row.count as number | string),
          tokensIn: toNumber(row.tokensIn as number | string),
          tokensOut: toNumber(row.tokensOut as number | string),
          costUsd: Number(toNumber(row.costUsd as number | string).toFixed(6)),
        })),
      },
    });
  }
);

tokenQuotaRoutes.get("/models", async (c) => {
  return c.json({
    success: true,
    data: {
      creditsPerDollar: CREDITS_PER_DOLLAR,
      models: SUPPORTED_MODELS,
    },
  });
});

export default tokenQuotaRoutes;
