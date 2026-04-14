import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware, adminOnly } from "../middleware/auth.js";
import { transferCredits } from "../lib/credit-service.js";
import { TIP_PLATFORM_FEE_RATE } from "../db/seed-credits.js";
import { createNotification } from "../lib/notify.js";

const creditRoutes = new Hono();

const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["earn", "spend", "transfer", "freeze", "unfreeze"]).optional(),
});

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.coerce.number().int().min(1),
  note: z.string().max(500).optional(),
});

const updateRuleSchema = z
  .object({
    points: z.coerce.number().int().optional(),
    dailyLimit: z.coerce.number().int().min(0).nullable().optional(),
    minTrustLevel: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    description: z.string().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const adminGrantSchema = z.object({
  userId: z.string().uuid(),
  amount: z.coerce.number().int().min(1),
  note: z.string().max(500).optional(),
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

async function grantCreditsDirect(userId: string, amount: number, note?: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO credit_accounts (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `);

    await tx.execute(sql`
      SELECT user_id
      FROM credit_accounts
      WHERE user_id = ${userId}
      FOR UPDATE
    `);

    const rows = asRows<{
      balance: number | string;
      frozen: number | string;
      lifetime_earned: number | string;
    }>(
      await tx.execute(sql`
        UPDATE credit_accounts
        SET balance = balance + ${amount},
            lifetime_earned = lifetime_earned + ${amount},
            updated_at = now()
        WHERE user_id = ${userId}
        RETURNING balance, frozen, lifetime_earned
      `)
    );

    await tx.execute(sql`
      INSERT INTO credit_transactions (user_id, type, amount, action, note)
      VALUES (${userId}, 'earn', ${amount}, 'admin_grant', ${note ?? "Admin grant"})
    `);

    return rows[0];
  });
}

creditRoutes.get("/balance", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<{
    balance: number | string | null;
    frozen: number | string | null;
    lifetimeEarned: number | string | null;
    trustLevel: number | string | null;
  }>(
    await db.execute(sql`
      SELECT
        COALESCE(ca.balance, 0)::int AS balance,
        COALESCE(ca.frozen, 0)::int AS frozen,
        COALESCE(ca.lifetime_earned, 0)::int AS "lifetimeEarned",
        COALESCE(tl.level, 0)::int AS "trustLevel"
      FROM users u
      LEFT JOIN credit_accounts ca ON ca.user_id = u.id
      LEFT JOIN trust_levels tl ON tl.user_id = u.id
      WHERE u.id = ${userId}
      LIMIT 1
    `)
  );

  const summary = rows[0] ?? {
    balance: 0,
    frozen: 0,
    lifetimeEarned: 0,
    trustLevel: 0,
  };

  return c.json({
    success: true,
    data: {
      balance: toNumber(summary.balance),
      frozen: toNumber(summary.frozen),
      lifetimeEarned: toNumber(summary.lifetimeEarned),
      trustLevel: toNumber(summary.trustLevel),
    },
  });
});

creditRoutes.get(
  "/transactions",
  authMiddleware,
  zValidator("query", transactionQuerySchema),
  async (c) => {
    const { userId } = c.get("user");
    const { page, limit, type } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const whereClause = type
      ? sql`WHERE user_id = ${userId} AND type = ${type}`
      : sql`WHERE user_id = ${userId}`;

    const items = asRows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT
          id,
          type,
          amount,
          action,
          ref_id AS "refId",
          ref_type AS "refType",
          note,
          created_at AS "createdAt"
        FROM credit_transactions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `)
    );

    const totalRows = asRows<{ total: number | string }>(
      await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM credit_transactions
        ${whereClause}
      `)
    );

    const total = toNumber(totalRows[0]?.total);

    return c.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          amount: toNumber(item.amount as number | string),
          action: item.action,
          refId: item.refId ?? null,
          refType: item.refType ?? null,
          note: item.note ?? null,
          createdAt: item.createdAt,
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

creditRoutes.get("/transactions/summary", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 AND created_at >= date_trunc('day', now()) THEN amount ELSE 0 END), 0)::int AS "todayEarned",
        COALESCE(SUM(CASE WHEN amount < 0 AND created_at >= date_trunc('day', now()) THEN ABS(amount) ELSE 0 END), 0)::int AS "todaySpent",
        COALESCE(SUM(CASE WHEN amount > 0 AND created_at >= date_trunc('week', now()) THEN amount ELSE 0 END), 0)::int AS "weekEarned",
        COALESCE(SUM(CASE WHEN amount < 0 AND created_at >= date_trunc('week', now()) THEN ABS(amount) ELSE 0 END), 0)::int AS "weekSpent",
        COALESCE(SUM(CASE WHEN amount > 0 AND created_at >= date_trunc('month', now()) THEN amount ELSE 0 END), 0)::int AS "monthEarned",
        COALESCE(SUM(CASE WHEN amount < 0 AND created_at >= date_trunc('month', now()) THEN ABS(amount) ELSE 0 END), 0)::int AS "monthSpent"
      FROM credit_transactions
      WHERE user_id = ${userId}
    `)
  );

  const summary = rows[0] ?? {};

  return c.json({
    success: true,
    data: {
      today: {
        earned: toNumber(summary.todayEarned as number | string),
        spent: toNumber(summary.todaySpent as number | string),
      },
      week: {
        earned: toNumber(summary.weekEarned as number | string),
        spent: toNumber(summary.weekSpent as number | string),
      },
      month: {
        earned: toNumber(summary.monthEarned as number | string),
        spent: toNumber(summary.monthSpent as number | string),
      },
    },
  });
});

creditRoutes.post(
  "/transfer",
  authMiddleware,
  zValidator("json", transferSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { toUserId, amount, note } = c.req.valid("json");

    if (userId === toUserId) {
      return c.json({ success: false, error: "Cannot transfer to yourself" }, 400);
    }

    const userRows = asRows<{ id: string }>(
      await db.execute(sql`
        SELECT id
        FROM users
        WHERE id = ${toUserId}
        LIMIT 1
      `)
    );

    if (!userRows[0]) {
      return c.json({ success: false, error: "Recipient not found" }, 404);
    }

    try {
      const result = await db.transaction(async (tx) => {
        const transfer = await transferCredits(userId, toUserId, amount, TIP_PLATFORM_FEE_RATE, {
          action: "tip_transfer",
          refType: "user",
          note,
          executor: tx,
        });

        await tx.execute(sql`
          INSERT INTO tips (
            from_user_id,
            to_user_id,
            amount,
            platform_fee,
            target_type,
            target_id
          )
          VALUES (
            ${userId},
            ${toUserId},
            ${amount},
            ${transfer.platformFee},
            'user',
            ${toUserId}
          )
        `);

        return transfer;
      });

      createNotification({
        type: "credit_transfer",
        fromUserId: userId,
        toUserId,
        title: "你收到了一笔积分转账",
        content: note,
        relatedId: toUserId,
        relatedType: "user",
      });

      return c.json({ success: true, data: result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Transfer failed",
        },
        400
      );
    }
  }
);

creditRoutes.get("/rules", async (c) => {
  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        action,
        points,
        daily_limit AS "dailyLimit",
        min_trust_level AS "minTrustLevel",
        is_active AS "isActive",
        description,
        updated_at AS "updatedAt"
      FROM credit_rules
      WHERE is_active = true
      ORDER BY action ASC
    `)
  );

  return c.json({
    success: true,
    data: rows.map((row) => ({
      action: row.action,
      points: toNumber(row.points as number | string),
      dailyLimit:
        row.dailyLimit === null
          ? null
          : toNumber(row.dailyLimit as number | string),
      minTrustLevel: toNumber(row.minTrustLevel as number | string),
      isActive: Boolean(row.isActive),
      description: row.description ?? null,
      updatedAt: row.updatedAt,
    })),
  });
});

creditRoutes.put(
  "/admin/rules/:action",
  authMiddleware,
  adminOnly,
  zValidator("json", updateRuleSchema),
  async (c) => {
    const action = c.req.param("action");
    const body = c.req.valid("json");

    const rows = asRows<Record<string, unknown>>(
      await db.execute(sql`
        UPDATE credit_rules
        SET
          points = COALESCE(${body.points ?? null}, points),
          daily_limit = CASE
            WHEN ${body.dailyLimit === undefined} THEN daily_limit
            ELSE ${body.dailyLimit ?? null}
          END,
          min_trust_level = COALESCE(${body.minTrustLevel ?? null}, min_trust_level),
          is_active = COALESCE(${body.isActive ?? null}, is_active),
          description = COALESCE(${body.description ?? null}, description),
          updated_at = now()
        WHERE action = ${action}
        RETURNING
          action,
          points,
          daily_limit AS "dailyLimit",
          min_trust_level AS "minTrustLevel",
          is_active AS "isActive",
          description,
          updated_at AS "updatedAt"
      `)
    );

    const updated = rows[0];

    if (!updated) {
      return c.json({ success: false, error: "Rule not found" }, 404);
    }

    return c.json({ success: true, data: updated });
  }
);

creditRoutes.post(
  "/admin/grant",
  authMiddleware,
  adminOnly,
  zValidator("json", adminGrantSchema),
  async (c) => {
    const { userId, amount, note } = c.req.valid("json");

    const userRows = asRows<{ id: string }>(
      await db.execute(sql`
        SELECT id
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `)
    );

    if (!userRows[0]) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    try {
      const result = await grantCreditsDirect(userId, amount, note);

      createNotification({
        type: "credit_grant",
        fromUserId: c.get("user").userId,
        toUserId: userId,
        title: "管理员向你发放了积分",
        content: note,
        relatedId: userId,
        relatedType: "user",
      });

      return c.json({
        success: true,
        data: {
          balance: toNumber(result.balance),
          frozen: toNumber(result.frozen),
          lifetimeEarned: toNumber(result.lifetime_earned),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Grant failed",
        },
        400
      );
    }
  }
);

export default creditRoutes;
