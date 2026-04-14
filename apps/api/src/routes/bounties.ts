import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { freezeCredits, transferCredits, unfreezeCredits, awardCredits } from "../lib/credit-service.js";
import { BOUNTY_PLATFORM_FEE_RATE } from "../db/seed-credits.js";
import { createNotification } from "../lib/notify.js";

const bountyRoutes = new Hono();

const createBountySchema = z.object({
  postId: z.string().uuid(),
  amount: z.coerce.number().int().min(50),
  expiresAt: z.string().datetime().optional(),
});

const awardBountySchema = z
  .object({
    winnerId: z.string().uuid().optional(),
    replyId: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.winnerId || value.replyId), {
    message: "winnerId or replyId is required",
  });

function asRows<T>(result: unknown): T[] {
  return result as T[];
}

bountyRoutes.post(
  "/",
  authMiddleware,
  zValidator("json", createBountySchema),
  async (c) => {
    const { userId, role } = c.get("user");
    const { postId, amount, expiresAt } = c.req.valid("json");

    const postRows = asRows<{ user_id: string }>(
      await db.execute(sql`
        SELECT user_id
        FROM forum_posts
        WHERE id = ${postId}
        LIMIT 1
      `)
    );

    const post = postRows[0];

    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }

    if (post.user_id !== userId && role !== "admin" && role !== "moderator") {
      return c.json({ success: false, error: "Only the post owner can create a bounty" }, 403);
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const result = await db.transaction(async (tx) => {
        await freezeCredits(
          userId,
          amount,
          "bounty_created",
          postId,
          "post",
          "创建悬赏",
          tx
        );

        const rows = asRows<Record<string, unknown>>(
          await tx.execute(sql`
            INSERT INTO bounties (
              post_id,
              sponsor_id,
              amount,
              expires_at
            )
            VALUES (
              ${postId},
              ${userId},
              ${amount},
              ${expiresAtDate}
            )
            RETURNING
              id,
              post_id AS "postId",
              sponsor_id AS "sponsorId",
              amount,
              status,
              winner_id AS "winnerId",
              expires_at AS "expiresAt",
              created_at AS "createdAt"
          `)
        );

        return rows[0];
      });

      return c.json({ success: true, data: result }, 201);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Create bounty failed",
        },
        400
      );
    }
  }
);

bountyRoutes.post(
  "/:id/award",
  authMiddleware,
  zValidator("json", awardBountySchema),
  async (c) => {
    const bountyId = c.req.param("id");
    const { userId, role } = c.get("user");
    const { winnerId, replyId } = c.req.valid("json");

    try {
      const result = await db.transaction(async (tx) => {
        const bountyRows = asRows<Record<string, unknown>>(
          await tx.execute(sql`
            SELECT id, post_id AS "postId", sponsor_id AS "sponsorId", amount, status
            FROM bounties
            WHERE id = ${bountyId}
            LIMIT 1
            FOR UPDATE
          `)
        );

        const bounty = bountyRows[0];

        if (!bounty) {
          throw new Error("Bounty not found");
        }

        if (String(bounty.sponsorId) !== userId && role !== "admin" && role !== "moderator") {
          throw new Error("Not authorized to award this bounty");
        }

        if (bounty.status !== "open") {
          throw new Error("Bounty is not open");
        }

        let resolvedWinnerId = winnerId ?? null;
        let resolvedReplyId = replyId ?? null;

        if (resolvedReplyId) {
          const replyRows = asRows<Record<string, unknown>>(
            await tx.execute(sql`
              SELECT id, user_id AS "userId", post_id AS "postId"
              FROM forum_replies
              WHERE id = ${resolvedReplyId}
              LIMIT 1
            `)
          );

          const reply = replyRows[0];

          if (!reply || String(reply.postId) !== String(bounty.postId)) {
            throw new Error("Reply not found in the bounty post");
          }

          resolvedWinnerId = String(reply.userId);
        }

        if (!resolvedWinnerId) {
          throw new Error("Winner not found");
        }

        await unfreezeCredits(
          String(bounty.sponsorId),
          Number(bounty.amount),
          "bounty_release",
          bountyId,
          "bounty",
          "颁奖前释放冻结积分",
          tx
        );

        await transferCredits(
          String(bounty.sponsorId),
          resolvedWinnerId,
          Number(bounty.amount),
          BOUNTY_PLATFORM_FEE_RATE,
          {
            action: "bounty_award",
            refId: bountyId,
            refType: "bounty",
            note: "悬赏颁奖",
            executor: tx,
          }
        );

        await tx.execute(sql`
          UPDATE bounties
          SET status = 'awarded',
              winner_id = ${resolvedWinnerId}
          WHERE id = ${bountyId}
        `);

        if (resolvedReplyId) {
          await tx.execute(sql`
            UPDATE forum_posts
            SET best_answer_id = ${resolvedReplyId},
                updated_at = now()
            WHERE id = ${String(bounty.postId)}
          `);
        }

        await awardCredits(
          resolvedWinnerId,
          "best_answer",
          String(bounty.postId),
          "post",
          "悬赏采纳为最佳答案",
          tx
        );

        return {
          bountyId,
          postId: String(bounty.postId),
          winnerId: resolvedWinnerId,
          replyId: resolvedReplyId,
        };
      });

      createNotification({
        type: "bounty_award",
        fromUserId: userId,
        toUserId: result.winnerId,
        title: "你的回答获得了悬赏奖励",
        relatedId: result.bountyId,
        relatedType: "bounty",
      });

      return c.json({ success: true, data: result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Award bounty failed",
        },
        400
      );
    }
  }
);

bountyRoutes.post("/:id/cancel", authMiddleware, async (c) => {
  const bountyId = c.req.param("id");
  const { userId, role } = c.get("user");

  try {
    const result = await db.transaction(async (tx) => {
      const bountyRows = asRows<Record<string, unknown>>(
        await tx.execute(sql`
          SELECT id, sponsor_id AS "sponsorId", amount, status
          FROM bounties
          WHERE id = ${bountyId}
          LIMIT 1
          FOR UPDATE
        `)
      );

      const bounty = bountyRows[0];

      if (!bounty) {
        throw new Error("Bounty not found");
      }

      if (String(bounty.sponsorId) !== userId && role !== "admin" && role !== "moderator") {
        throw new Error("Not authorized to cancel this bounty");
      }

      if (bounty.status !== "open") {
        throw new Error("Bounty is not open");
      }

      await unfreezeCredits(
        String(bounty.sponsorId),
        Number(bounty.amount),
        "bounty_cancel",
        bountyId,
        "bounty",
        "取消悬赏，退回积分",
        tx
      );

      await tx.execute(sql`
        UPDATE bounties
        SET status = 'cancelled'
        WHERE id = ${bountyId}
      `);

      return { bountyId };
    });

    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cancel bounty failed",
      },
      400
    );
  }
});

bountyRoutes.get("/active", async (c) => {
  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT
        b.id,
        b.post_id AS "postId",
        b.sponsor_id AS "sponsorId",
        b.amount,
        b.status,
        b.winner_id AS "winnerId",
        b.expires_at AS "expiresAt",
        b.created_at AS "createdAt",
        p.title AS "postTitle",
        u.username AS "sponsorUsername"
      FROM bounties b
      JOIN forum_posts p ON p.id = b.post_id
      JOIN users u ON u.id = b.sponsor_id
      WHERE b.status = 'open'
        AND b.expires_at > now()
      ORDER BY b.created_at DESC
    `)
  );

  return c.json({ success: true, data: rows });
});

export default bountyRoutes;
