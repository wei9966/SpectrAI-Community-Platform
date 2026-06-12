import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import jwt from "jsonwebtoken";
const { verify, sign } = jwt;
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import type { JwtPayload, ClaudeOpsJwtPayload } from "../middleware/auth.js";
import { bindInviteCodeToUser } from "./invite.js";

const authBridgeRoutes = new Hono();

// ── Validation ────────────────────────────────────────────────
const linkSchema = z.object({
  token: z.string().min(1, "ClaudeOps JWT token is required"),
  // Optional explicit invite code. Normally the code travels inside the
  // ClaudeOps token payload (referral_code); this is a fallback channel.
  inviteCode: z.string().min(4).max(32).optional(),
  referralCode: z.string().min(4).max(32).optional(),
  referral_code: z.string().min(4).max(32).optional(),
});

type InviteBindingResult = {
  status: "bound" | "skipped" | "error";
  reason?: string;
};

// ── Helpers ───────────────────────────────────────────────────
function getClaudeOpsSecret(): string {
  const env = getEnv();
  return env.CLAUDEOPS_JWT_SECRET || env.JWT_SECRET;
}

/**
 * Resolve the invite code the community user should be bound to, preferring the
 * ClaudeOps token payload (the code the user registered with) and falling back
 * to any explicit field on the request body.
 */
function resolveInviteCode(
  payload: ClaudeOpsJwtPayload,
  body: { inviteCode?: string; referralCode?: string; referral_code?: string }
): string | null {
  const candidate =
    payload.referral_code ??
    payload.referralCode ??
    payload.inviteCode ??
    body.inviteCode ??
    body.referralCode ??
    body.referral_code ??
    null;
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Bind the invite code to a freshly linked/created community user. A linking
 * call must never fail because of invite-code issues (already bound, invalid,
 * self-invite, …): we log a warning and surface a non-fatal status instead.
 */
async function tryBindInvite(
  userId: string,
  code: string | null
): Promise<InviteBindingResult> {
  if (!code) {
    return { status: "skipped", reason: "no_code" };
  }

  try {
    await bindInviteCodeToUser(userId, code);
    return { status: "bound" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    // Already-bound / already-used / self-invite / not-found are all expected,
    // recoverable states — keep the account link successful regardless.
    console.warn("[auth/claudeops/link] invite binding skipped:", {
      userId,
      code,
      reason,
    });
    const isExpected =
      reason === "Invite code already bound" ||
      reason === "Invite code already used" ||
      reason === "Cannot bind your own invite code" ||
      reason === "Invite code not found";
    return { status: isExpected ? "skipped" : "error", reason };
  }
}

function signCommunityToken(payload: JwtPayload): string {
  return sign(payload, getEnv().JWT_SECRET, { expiresIn: "7d" });
}

function decodeClaudeOpsToken(token: string): ClaudeOpsJwtPayload {
  const payload = verify(token, getClaudeOpsSecret(), { algorithms: ["HS256"] });
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as Record<string, unknown>).type !== "access"
  ) {
    throw new Error("Not a valid ClaudeOps access token");
  }
  return payload as unknown as ClaudeOpsJwtPayload;
}

function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ── POST /api/auth/claudeops/link ─────────────────────────────
// Accept a ClaudeOps JWT, auto-create or link a Community user.
authBridgeRoutes.post(
  "/claudeops/link",
  zValidator("json", linkSchema),
  async (c) => {
    const { token, inviteCode, referralCode, referral_code } =
      c.req.valid("json");

    let claudeOpsPayload: ClaudeOpsJwtPayload;
    try {
      claudeOpsPayload = decodeClaudeOpsToken(token);
    } catch {
      return c.json(
        { success: false, error: "Invalid or expired ClaudeOps token" },
        401
      );
    }

    const { sub: claudeopsUuid, email, plan } = claudeOpsPayload;
    const inviteCodeToBind = resolveInviteCode(claudeOpsPayload, {
      inviteCode,
      referralCode,
      referral_code,
    });

    // Check if already linked by claudeopsUuid
    const [existingLinked] = await db
      .select()
      .from(users)
      .where(eq(users.claudeopsUuid, claudeopsUuid))
      .limit(1);

    if (existingLinked) {
      // Update plan if changed
      if (existingLinked.claudeopsPlan !== plan) {
        await db
          .update(users)
          .set({ claudeopsPlan: plan, updatedAt: new Date() })
          .where(eq(users.id, existingLinked.id));
      }

      // Re-link of an already-linked account: still attempt binding so users
      // linked before this fix (no promoter_rewards) get backfilled on next login.
      const inviteBinding = await tryBindInvite(
        existingLinked.id,
        inviteCodeToBind
      );

      const communityToken = signCommunityToken({
        userId: existingLinked.id,
        username: existingLinked.username,
        role: existingLinked.role,
      });

      return c.json({
        success: true,
        data: {
          user: sanitizeUser(existingLinked),
          token: communityToken,
          isNewUser: false,
          inviteBinding,
        },
      });
    }

    // Try to find by email and link
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingByEmail) {
      const [updated] = await db
        .update(users)
        .set({
          claudeopsUuid,
          claudeopsPlan: plan,
          claudeopsLinkedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();

      const inviteBinding = await tryBindInvite(updated.id, inviteCodeToBind);

      const communityToken = signCommunityToken({
        userId: updated.id,
        username: updated.username,
        role: updated.role,
      });

      return c.json({
        success: true,
        data: {
          user: sanitizeUser(updated),
          token: communityToken,
          isNewUser: false,
          inviteBinding,
        },
      });
    }

    // Create new user — derive username from email prefix
    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_");
    let username = baseUsername;
    let suffix = 1;

    // Ensure unique username
    while (true) {
      const [conflict] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (!conflict) break;
      username = `${baseUsername}_${suffix++}`;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        claudeopsUuid,
        claudeopsPlan: plan,
        claudeopsLinkedAt: new Date(),
      })
      .returning();

    const inviteBinding = await tryBindInvite(newUser.id, inviteCodeToBind);

    const communityToken = signCommunityToken({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
    });

    return c.json(
      {
        success: true,
        data: {
          user: sanitizeUser(newUser),
          token: communityToken,
          isNewUser: true,
          inviteBinding,
        },
      },
      201
    );
  }
);

// ── GET /api/auth/claudeops/verify ────────────────────────────
// Verify a ClaudeOps JWT and return the linked Community user.
authBridgeRoutes.get("/claudeops/verify", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { success: false, error: "Authorization header required" },
      401
    );
  }

  const token = authHeader.slice(7);

  let claudeOpsPayload: ClaudeOpsJwtPayload;
  try {
    claudeOpsPayload = decodeClaudeOpsToken(token);
  } catch {
    return c.json(
      { success: false, error: "Invalid or expired ClaudeOps token" },
      401
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.claudeopsUuid, claudeOpsPayload.sub))
    .limit(1);

  if (!user) {
    return c.json(
      { success: false, error: "ClaudeOps account not linked", linked: false },
      404
    );
  }

  return c.json({
    success: true,
    data: {
      linked: true,
      user: sanitizeUser(user),
      claudeopsPlan: user.claudeopsPlan,
    },
  });
});

export default authBridgeRoutes;
