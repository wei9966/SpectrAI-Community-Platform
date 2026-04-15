import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  getPromoterConfig,
  grantInviteeWelcome,
  processPromoterReward,
} from "../lib/promoter-service.js";
import { createNotification } from "../lib/notify.js";

const inviteRoutes = new Hono();

const bindSchema = z.object({
  code: z.string().min(4).max(16),
});

function asRows<T>(result: unknown): T[] {
  return result as T[];
}

async function ensureInviteCode(userId: string): Promise<{ id: string; code: string }> {
  const existingRows = asRows<{ id: string; code: string }>(
    await db.execute(sql`
      SELECT id, code
      FROM invite_codes
      WHERE inviter_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `)
  );

  if (existingRows[0]) {
    return existingRows[0];
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomBytes(6).toString("hex").toUpperCase();

    try {
      const insertedRows = asRows<{ id: string; code: string }>(
        await db.execute(sql`
          INSERT INTO invite_codes (code, inviter_id)
          VALUES (${code}, ${userId})
          RETURNING id, code
        `)
      );

      const inserted = insertedRows[0];
      if (inserted) {
        return inserted;
      }
    } catch {
      // retry on unique collision
    }
  }

  throw new Error("Failed to generate invite code");
}

inviteRoutes.post("/generate", authMiddleware, async (c) => {
  try {
    const { userId } = c.get("user");
    const inviteCode = await ensureInviteCode(userId);
    return c.json({ success: true, data: inviteCode });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate invite code",
      },
      400
    );
  }
});

inviteRoutes.get("/stats", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const statsRows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE invitee_id IS NOT NULL)::int AS bound,
        COUNT(*) FILTER (WHERE reward_status = 'granted')::int AS granted,
        COUNT(*) FILTER (WHERE reward_status = 'pending')::int AS pending
      FROM invite_codes
      WHERE inviter_id = ${userId}
    `)
  );

  const inviteRows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        ic.id,
        ic.code,
        ic.reward_status AS "rewardStatus",
        ic.reward_frozen_until AS "rewardFrozenUntil",
        ic.created_at AS "createdAt",
        u.id AS "inviteeId",
        u.username AS "inviteeUsername"
      FROM invite_codes ic
      LEFT JOIN users u ON u.id = ic.invitee_id
      WHERE ic.inviter_id = ${userId}
      ORDER BY ic.created_at DESC
    `)
  );

  return c.json({
    success: true,
    data: {
      summary: statsRows[0] ?? { total: 0, bound: 0, granted: 0, pending: 0 },
      items: inviteRows,
    },
  });
});

inviteRoutes.post(
  "/bind",
  authMiddleware,
  zValidator("json", bindSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { code } = c.req.valid("json");
    const promoterConfig = await getPromoterConfig();

    const existingRows = asRows<{ id: string }>(
      await db.execute(sql`
        SELECT id
        FROM invite_codes
        WHERE invitee_id = ${userId}
        LIMIT 1
      `)
    );

    if (existingRows[0]) {
      return c.json({ success: false, error: "Invite code already bound" }, 400);
    }

    try {
      const result = await db.transaction(async (tx) => {
        const inviteRows = asRows<Record<string, unknown>>(
          await tx.execute(sql`
            SELECT id, inviter_id AS "inviterId", invitee_id AS "inviteeId"
            FROM invite_codes
            WHERE code = ${code.toUpperCase()}
            LIMIT 1
            FOR UPDATE
          `)
        );

        const invite = inviteRows[0];

        if (!invite) {
          throw new Error("Invite code not found");
        }

        if (invite.inviteeId) {
          throw new Error("Invite code already used");
        }

        if (invite.inviterId === userId) {
          throw new Error("Cannot bind your own invite code");
        }

        await tx.execute(sql`
          UPDATE invite_codes
          SET invitee_id = ${userId}
          WHERE id = ${String(invite.id)}
        `);

        const rewardResult = await processPromoterReward(
          String(invite.inviterId),
          userId,
          String(invite.id),
          tx as { execute: typeof tx.execute }
        );

        await grantInviteeWelcome(
          userId,
          String(invite.id),
          tx as { execute: typeof tx.execute }
        );

        const rewardFrozenUntil = rewardResult.releaseAt ?? (promoterConfig.enabled ? new Date(Date.now() + promoterConfig.rewardDelayHours * 60 * 60 * 1000) : null);
        const rewardStatus = rewardResult.rewards.length > 0 ? "pending" : "granted";

        await tx.execute(sql`
          UPDATE invite_codes
          SET reward_status = ${rewardStatus},
              reward_frozen_until = ${rewardFrozenUntil}
          WHERE id = ${String(invite.id)}
        `);

        return {
          inviteId: String(invite.id),
          inviterId: String(invite.inviterId),
          code: code.toUpperCase(),
          rewardStatus,
        };
      });

      createNotification({
        type: "invite_bound",
        fromUserId: userId,
        toUserId: result.inviterId,
        title: "有新用户通过你的邀请码完成绑定",
        content: `邀请码 ${result.code} 已绑定成功，当前奖励状态：${result.rewardStatus}`,
        relatedId: result.inviteId,
        relatedType: "invite",
      });

      return c.json({ success: true, data: result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Bind invite code failed",
        },
        400
      );
    }
  }
);

inviteRoutes.get("/code", authMiddleware, async (c) => {
  try {
    const { userId } = c.get("user");
    const inviteCode = await ensureInviteCode(userId);
    return c.json({ success: true, data: inviteCode });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get invite code",
      },
      400
    );
  }
});

export default inviteRoutes;
