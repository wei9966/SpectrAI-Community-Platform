import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { authMiddleware, adminOnly } from "../../middleware/auth.js";
import {
  batchReleasePendingRewards,
  getOrCreateProfile,
  updatePromoterLevel,
} from "../../lib/promoter-service.js";

const adminPromoterRoutes = new Hono();

adminPromoterRoutes.use("*", authMiddleware, adminOnly);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

const updateLevelSchema = z.object({
  level: z.enum(["bronze", "silver", "gold", "platinum", "diamond"]),
});

const releaseRewardsSchema = z.object({
  rewardIds: z.array(z.string().uuid()).min(1).optional(),
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

adminPromoterRoutes.get(
  "/list",
  zValidator("query", listQuerySchema),
  async (c) => {
    const { page, limit, search } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const keyword = search ? `%${search}%` : null;
    const whereClause = keyword
      ? sql`WHERE u.username ILIKE ${keyword} OR u.email ILIKE ${keyword}`
      : sql``;

    const [itemsResult, totalResult] = await Promise.all([
      db.execute(sql`
        SELECT
          pp.id,
          pp.user_id AS "userId",
          pp.level,
          pp.total_invites AS "totalInvites",
          pp.total_credits_earned AS "totalCreditsEarned",
          pp.created_at AS "createdAt",
          pp.updated_at AS "updatedAt",
          u.username,
          u.email,
          COALESCE(SUM(CASE WHEN pr.status = 'pending' AND pr.reward_type = 'credits' THEN pr.amount ELSE 0 END), 0)::int AS "pendingCredits",
          COALESCE(SUM(CASE WHEN pr.status = 'released' AND pr.reward_type = 'credits' THEN pr.amount ELSE 0 END), 0)::int AS "releasedCredits",
          COUNT(pr.id)::int AS "rewardCount"
        FROM promoter_profiles pp
        INNER JOIN users u ON u.id = pp.user_id
        LEFT JOIN promoter_rewards pr ON pr.promoter_user_id = pp.user_id
        ${whereClause}
        GROUP BY pp.id, pp.user_id, pp.level, pp.total_invites, pp.total_credits_earned, pp.created_at, pp.updated_at, u.username, u.email
        ORDER BY pp.updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM promoter_profiles pp
        INNER JOIN users u ON u.id = pp.user_id
        ${whereClause}
      `),
    ]);

    const items = asRows<Record<string, unknown>>(itemsResult);
    const total = toNumber(asRows<{ total: number | string }>(totalResult)[0]?.total);

    return c.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          userId: item.userId,
          username: item.username,
          email: item.email,
          level: item.level,
          totalInvites: toNumber(item.totalInvites as number | string),
          totalCreditsEarned: toNumber(item.totalCreditsEarned as number | string),
          pendingCredits: toNumber(item.pendingCredits as number | string),
          releasedCredits: toNumber(item.releasedCredits as number | string),
          rewardCount: toNumber(item.rewardCount as number | string),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
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

adminPromoterRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  const [userRow] = asRows<{ id: string; username: string; email: string }>(
    await db.execute(sql`
      SELECT id, username, email
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `)
  );

  if (!userRow) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  const profile = await getOrCreateProfile(userId);

  const rewards = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        pr.id,
        pr.reward_type AS "rewardType",
        pr.amount,
        pr.status,
        pr.release_at AS "releaseAt",
        pr.released_at AS "releasedAt",
        pr.created_at AS "createdAt",
        iu.id AS "inviteeUserId",
        iu.username AS "inviteeUsername",
        iu.email AS "inviteeEmail"
      FROM promoter_rewards pr
      LEFT JOIN users iu ON iu.id = pr.invitee_user_id
      WHERE pr.promoter_user_id = ${userId}
      ORDER BY pr.created_at DESC
      LIMIT 100
    `)
  );

  return c.json({
    success: true,
    data: {
      user: userRow,
      profile,
      rewards: rewards.map((row) => ({
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
              email: row.inviteeEmail,
            }
          : null,
      })),
    },
  });
});

adminPromoterRoutes.patch(
  "/:userId/level",
  zValidator("json", updateLevelSchema),
  async (c) => {
    const userId = c.req.param("userId");
    const { level } = c.req.valid("json");
    const profile = await updatePromoterLevel(userId, level);

    return c.json({ success: true, data: profile });
  }
);

adminPromoterRoutes.post(
  "/release-rewards",
  zValidator("json", releaseRewardsSchema),
  async (c) => {
    const { rewardIds } = c.req.valid("json");
    const result = await batchReleasePendingRewards(rewardIds);

    return c.json({ success: true, data: result });
  }
);

export default adminPromoterRoutes;
