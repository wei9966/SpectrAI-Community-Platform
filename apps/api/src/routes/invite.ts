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
import { dispatchMembershipGrantOutboxBestEffort } from "../lib/claudeops-membership-client.js";
import { createNotification } from "../lib/notify.js";

const inviteRoutes = new Hono();

const bindSchema = z.object({
  code: z.string().min(4).max(16),
});

function asRows<T>(result: unknown): T[] {
  return result as T[];
}

function toTimestampParam(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function ensureInviteCode(userId: string): Promise<{ id: string; code: string }> {
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
    }
  }

  throw new Error("Failed to generate invite code");
}

export async function bindInviteCodeToUser(
  userId: string,
  code: string
): Promise<{
  bound: boolean;
  inviteId: string;
  inviterId: string;
  code: string;
  rewardStatus: string;
}> {
  const normalizedCode = code.trim().toUpperCase();
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
    throw new Error("Invite code already bound");
  }

  const result = await db.transaction(async (tx) => {
    const inviteRows = asRows<Record<string, unknown>>(
      await tx.execute(sql`
        SELECT id, inviter_id AS "inviterId", invitee_id AS "inviteeId"
        FROM invite_codes
        WHERE code = ${normalizedCode}
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

    const rewardFrozenUntil =
      rewardResult.releaseAt ??
      (promoterConfig.enabled
        ? new Date(Date.now() + promoterConfig.rewardDelayHours * 60 * 60 * 1000)
        : null);
    const rewardStatus = rewardResult.rewards.length > 0 ? "pending" : "granted";
    const rewardFrozenUntilParam = toTimestampParam(rewardFrozenUntil);

    await tx.execute(sql`
      UPDATE invite_codes
      SET reward_status = ${rewardStatus},
          reward_frozen_until = ${rewardFrozenUntilParam}
      WHERE id = ${String(invite.id)}
    `);

    return {
      inviteId: String(invite.id),
      inviterId: String(invite.inviterId),
      code: normalizedCode,
      rewardStatus,
    };
  });

  // Transaction committed: the invitee's welcome grant + its cross-repo outbox row are
  // now durable. Best-effort immediate delivery to A-repo; never blocks the response.
  void dispatchMembershipGrantOutboxBestEffort();

  void createNotification({
    type: "invite_bound",
    fromUserId: userId,
    toUserId: result.inviterId,
    title: "有新用户通过你的邀请码完成绑定",
    content: `邀请码 ${result.code} 已绑定成功，当前奖励状态：${result.rewardStatus}`,
    relatedId: result.inviteId,
    relatedType: "invite",
  });

  return {
    bound: true,
    ...result,
  };
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

    try {
      const result = await bindInviteCodeToUser(userId, code);
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

inviteRoutes.get("/inviter/:code", async (c) => {
  const code = c.req.param("code").trim().toUpperCase();

  if (!code) {
    return c.json({ success: true, data: null });
  }

  const rows = asRows<{
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }>(
    await db.execute(sql`
      SELECT u.username AS "username",
             u.display_name AS "displayName",
             u.avatar_url AS "avatarUrl"
      FROM invite_codes ic
      JOIN users u ON u.id = ic.inviter_id
      WHERE ic.code = ${code}
      LIMIT 1
    `)
  );

  const inviter = rows[0];

  if (!inviter) {
    return c.json({ success: true, data: null });
  }

  return c.json({
    success: true,
    data: {
      username: inviter.username,
      displayName: inviter.displayName,
      avatarUrl: inviter.avatarUrl,
    },
  });
});

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
