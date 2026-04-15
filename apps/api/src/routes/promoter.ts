import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  getPromoterConfig,
  getPromoterStats,
  listPromoterLevels,
} from "../lib/promoter-service.js";

const promoterRoutes = new Hono();

const rewardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "released", "expired", "cancelled"]).optional(),
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

promoterRoutes.get("/config", async (c) => {
  const config = await getPromoterConfig();
  const levels = await listPromoterLevels();

  return c.json({
    success: true,
    data: {
      enabled: config.enabled,
      rewardDelayHours: config.rewardDelayHours,
      inviteeWelcomeCredits: config.inviteeWelcomeCredits,
      levels,
    },
  });
});

promoterRoutes.get("/profile", authMiddleware, async (c) => {
  const { userId } = c.get("user");
  const stats = await getPromoterStats(userId);

  const recentRewardRows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        pr.id,
        pr.reward_type AS "rewardType",
        pr.amount,
        pr.status,
        pr.release_at AS "releaseAt",
        pr.released_at AS "releasedAt",
        pr.created_at AS "createdAt",
        u.id AS "inviteeUserId",
        u.username AS "inviteeUsername"
      FROM promoter_rewards pr
      LEFT JOIN users u ON u.id = pr.invitee_user_id
      WHERE pr.promoter_user_id = ${userId}
      ORDER BY pr.created_at DESC
      LIMIT 5
    `)
  );

  return c.json({
    success: true,
    data: {
      ...stats,
      recentRewards: recentRewardRows.map((row) => ({
        id: row.id,
        rewardType: row.rewardType,
        amount: toNumber(row.amount as number | string),
        status: row.status,
        releaseAt: row.releaseAt,
        releasedAt: row.releasedAt,
        createdAt: row.createdAt,
        invitee: row.inviteeUserId
          ? {
              id: row.inviteeUserId,
              username: row.inviteeUsername,
            }
          : null,
      })),
    },
  });
});

promoterRoutes.get(
  "/rewards",
  authMiddleware,
  zValidator("query", rewardQuerySchema),
  async (c) => {
    const { userId } = c.get("user");
    const { page, limit, status } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const whereClause = status
      ? sql`WHERE pr.promoter_user_id = ${userId} AND pr.status = ${status}`
      : sql`WHERE pr.promoter_user_id = ${userId}`;

    const [items, totalRows] = await Promise.all([
      db.execute(sql`
        SELECT
          pr.id,
          pr.reward_type AS "rewardType",
          pr.amount,
          pr.status,
          pr.release_at AS "releaseAt",
          pr.released_at AS "releasedAt",
          pr.created_at AS "createdAt",
          pr.invite_code_id AS "inviteCodeId",
          u.id AS "inviteeUserId",
          u.username AS "inviteeUsername",
          u.email AS "inviteeEmail"
        FROM promoter_rewards pr
        LEFT JOIN users u ON u.id = pr.invitee_user_id
        ${whereClause}
        ORDER BY pr.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM promoter_rewards pr
        ${whereClause}
      `),
    ]);

    const rows = asRows<Record<string, unknown>>(items);
    const total = toNumber(asRows<{ total: number | string }>(totalRows)[0]?.total);

    return c.json({
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          rewardType: row.rewardType,
          amount: toNumber(row.amount as number | string),
          status: row.status,
          releaseAt: row.releaseAt,
          releasedAt: row.releasedAt,
          createdAt: row.createdAt,
          inviteCodeId: row.inviteCodeId,
          invitee: row.inviteeUserId
            ? {
                id: row.inviteeUserId,
                username: row.inviteeUsername,
                email: row.inviteeEmail,
              }
            : null,
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

promoterRoutes.get("/stats", authMiddleware, async (c) => {
  const { userId } = c.get("user");
  const baseStats = await getPromoterStats(userId);

  const [extraStatsRow] = asRows<{
    totalInvitees: number | string;
    last7DaysInvitees: number | string;
  }>(
    await db.execute(sql`
      SELECT
        COUNT(DISTINCT invitee_user_id)::int AS "totalInvitees",
        COUNT(DISTINCT invitee_user_id) FILTER (WHERE created_at >= now() - interval '7 days')::int AS "last7DaysInvitees"
      FROM promoter_rewards
      WHERE promoter_user_id = ${userId}
    `)
  );

  return c.json({
    success: true,
    data: {
      ...baseStats,
      invitees: {
        total: toNumber(extraStatsRow?.totalInvitees),
        last7Days: toNumber(extraStatsRow?.last7DaysInvitees),
      },
    },
  });
});

export default promoterRoutes;
