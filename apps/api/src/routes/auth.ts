import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import jwt from "jsonwebtoken";
const { sign } = jwt;
import bcrypt from "bcryptjs";
const { hash, compare } = bcrypt;
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import type { ApiResponse } from "../types/shared.js";

const authRoutes = new Hono();

// ── Validation schemas ──────────────────────────────────────
const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens and underscores"),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Helpers ─────────────────────────────────────────────────
function signToken(payload: JwtPayload): string {
  return sign(payload, getEnv().JWT_SECRET, { expiresIn: "7d" });
}

function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ── POST /api/auth/register ─────────────────────────────────
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { username, email, password } = c.req.valid("json");

  // Check existing
  const [existingEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) {
    return c.json({ success: false, error: "Email already registered" }, 409);
  }

  const [existingUsername] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existingUsername) {
    return c.json({ success: false, error: "Username already taken" }, 409);
  }

  const passwordHash = await hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ username, email, passwordHash })
    .returning();

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return c.json(
    { success: true, data: { user: sanitizeUser(user), token } },
    201
  );
});

// ── POST /api/auth/login ────────────────────────────────────
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.passwordHash) {
    return c.json({ success: false, error: "Invalid email or password" }, 401);
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ success: false, error: "Invalid email or password" }, 401);
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return c.json({ success: true, data: { user: sanitizeUser(user), token } });
});

// ── POST /api/auth/github ───────────────────────────────────
authRoutes.post("/github", async (c) => {
  const { code } = await c.req.json<{ code: string }>();
  if (!code) {
    return c.json({ success: false, error: "GitHub code is required" }, 400);
  }

  const env = getEnv();

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    return c.json(
      { success: false, error: "GitHub authentication failed" },
      401
    );
  }

  // Fetch GitHub user info
  const ghUserRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const ghUser = (await ghUserRes.json()) as {
    id: number;
    login: string;
    email: string | null;
    avatar_url: string;
    bio: string | null;
  };

  // Fetch primary email if not public
  let email = ghUser.email;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const emails = (await emailsRes.json()) as Array<{
      email: string;
      primary: boolean;
    }>;
    email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? null;
  }

  if (!email) {
    return c.json(
      { success: false, error: "Unable to retrieve email from GitHub" },
      400
    );
  }

  const githubId = String(ghUser.id);

  // Upsert user
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  if (!user) {
    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      // Link GitHub to existing account
      [user] = await db
        .update(users)
        .set({
          githubId,
          avatarUrl: existing.avatarUrl || ghUser.avatar_url,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
    } else {
      // Create new user
      [user] = await db
        .insert(users)
        .values({
          username: ghUser.login,
          email,
          githubId,
          avatarUrl: ghUser.avatar_url,
          bio: ghUser.bio,
        })
        .returning();
    }
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return c.json({ success: true, data: { user: sanitizeUser(user), token } });
});

// ── GET /api/auth/me ────────────────────────────────────────
authRoutes.get("/me", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  return c.json({ success: true, data: sanitizeUser(user) });
});

export default authRoutes;
