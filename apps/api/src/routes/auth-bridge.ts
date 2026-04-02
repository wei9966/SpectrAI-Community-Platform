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

const authBridgeRoutes = new Hono();

// ── Validation ────────────────────────────────────────────────
const linkSchema = z.object({
  token: z.string().min(1, "ClaudeOps JWT token is required"),
});

// ── Helpers ───────────────────────────────────────────────────
function signCommunityToken(payload: JwtPayload): string {
  return sign(payload, getEnv().JWT_SECRET, { expiresIn: "7d" });
}

function decodeClaudeOpsToken(token: string): ClaudeOpsJwtPayload {
  const payload = verify(token, getEnv().JWT_SECRET);
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
    const { token } = c.req.valid("json");

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
