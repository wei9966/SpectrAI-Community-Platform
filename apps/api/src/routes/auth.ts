import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import jwt from "jsonwebtoken";
const { sign } = jwt;
import bcrypt from "bcryptjs";
const { compare } = bcrypt;
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { bindInviteCodeToUser } from "./invite.js";

const authRoutes = new Hono();

type CommunityUser = typeof users.$inferSelect;

type ClaudeOpsUser = {
  uuid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: string | null;
};

type ClaudeOpsTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type ClaudeOpsVerifyData = {
  user: ClaudeOpsUser;
  tokens: ClaudeOpsTokens;
};

type ClaudeOpsErrorResponse = {
  success: false;
  error: string;
  [key: string]: unknown;
};

type ClaudeOpsRegisterResponse =
  | {
      success: true;
      data: {
        message?: string;
        email: string;
        expires_at?: string;
        verification_ttl?: number;
      };
      [key: string]: unknown;
    }
  | ClaudeOpsErrorResponse;

const usernameSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens and underscores");

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(8).max(100),
  inviteCode: z.string().min(4).max(16).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(12),
  username: usernameSchema,
  inviteCode: z.string().min(4).max(16).optional(),
});

function signToken(payload: JwtPayload): string {
  return sign(payload, getEnv().JWT_SECRET, { expiresIn: "7d" });
}

function sanitizeUser(user: CommunityUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}

class ClaudeOpsProxyError extends Error {
  constructor(
    public status: number,
    public response: ClaudeOpsErrorResponse
  ) {
    super(response.error);
  }
}

class UsernameConflictError extends Error {
  constructor(message = "Username already taken") {
    super(message);
  }
}

function normalizeClaudeOpsErrorResponse(
  json: unknown,
  fallbackError: string
): ClaudeOpsErrorResponse {
  if (
    json &&
    typeof json === "object" &&
    "success" in json &&
    (json as { success?: unknown }).success === false &&
    typeof (json as { error?: unknown }).error === "string"
  ) {
    return json as ClaudeOpsErrorResponse;
  }

  return {
    success: false,
    error: fallbackError,
  };
}

function buildUsernameBase(email: string) {
  return email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_") || "user";
}

async function createUniqueUsername(baseUsername: string) {
  let username = baseUsername;
  let suffix = 1;

  while (true) {
    const [conflict] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!conflict) {
      return username;
    }

    username = `${baseUsername}_${suffix++}`;
  }
}

async function proxyClaudeOpsLogin(email: string, password: string) {
  try {
    const url = `${getEnv().CLAUDEOPS_API_BASE_URL}/auth/login`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.success) return null;
    return json.data as ClaudeOpsVerifyData;
  } catch {
    return null;
  }
}

async function proxyClaudeOpsRegister(email: string, password: string, inviteCode?: string) {
  try {
    const url = `${getEnv().CLAUDEOPS_API_BASE_URL}/auth/register`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password, inviteCode }),
    });
    const json = await res.json().catch(() => null);

    return {
      status: res.status,
      json: res.ok
        ? (json as ClaudeOpsRegisterResponse)
        : normalizeClaudeOpsErrorResponse(json, "ClaudeOps registration failed"),
    };
  } catch {
    return {
      status: 502,
      json: {
        success: false,
        error: "ClaudeOps service unavailable",
      } satisfies ClaudeOpsErrorResponse,
    };
  }
}

async function proxyClaudeOpsVerifyCode(email: string, code: string): Promise<ClaudeOpsVerifyData | null> {
  try {
    const url = `${getEnv().CLAUDEOPS_API_BASE_URL}/auth/verify-code`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const json = await res.json().catch(() => null);

    if (
      !res.ok ||
      !json ||
      typeof json !== "object" ||
      !("success" in json) ||
      (json as { success?: unknown }).success !== true ||
      !("data" in json)
    ) {
      throw new ClaudeOpsProxyError(
        res.status || 401,
        normalizeClaudeOpsErrorResponse(json, "Invalid or expired verification code")
      );
    }

    return (json as { data: ClaudeOpsVerifyData }).data;
  } catch (error) {
    if (error instanceof ClaudeOpsProxyError) {
      throw error;
    }
    return null;
  }
}

async function autolinkClaudeOpsUser(
  coUser: ClaudeOpsUser,
  options?: { usernameHint?: string }
) {
  const claudeopsUuid = coUser.uuid;
  const plan = coUser.plan || "free";

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.claudeopsUuid, claudeopsUuid))
    .limit(1);

  if (!user) {
    [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, coUser.email))
      .limit(1);
  }

  if (user) {
    [user] = await db
      .update(users)
      .set({
        claudeopsUuid,
        claudeopsPlan: plan,
        claudeopsLinkedAt: new Date(),
        displayName: user.displayName || coUser.display_name,
        avatarUrl: user.avatarUrl || coUser.avatar_url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return user;
  }

  const usernameHint = options?.usernameHint?.trim();
  let username = usernameHint;

  if (username) {
    const [conflict] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (conflict) {
      throw new UsernameConflictError();
    }
  } else {
    username = await createUniqueUsername(buildUsernameBase(coUser.email));
  }

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email: coUser.email,
      claudeopsUuid,
      claudeopsPlan: plan,
      claudeopsLinkedAt: new Date(),
      displayName: coUser.display_name || null,
      avatarUrl: coUser.avatar_url || null,
    })
    .returning();

  return newUser;
}

authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { username, email, password, inviteCode } = c.req.valid("json");

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

  const claudeOpsRegister = await proxyClaudeOpsRegister(email, password, inviteCode);
  if (!claudeOpsRegister.json.success) {
    return c.json(claudeOpsRegister.json, { status: claudeOpsRegister.status as any });
  }

  return c.json({
    success: true,
    data: {
      message: claudeOpsRegister.json.data.message,
      email: claudeOpsRegister.json.data.email,
      verificationTtl: claudeOpsRegister.json.data.verification_ttl ?? 0,
      pendingUsername: username,
      pendingInviteCode: inviteCode ?? null,
    },
  });
});

authRoutes.post("/verify-code", zValidator("json", verifyCodeSchema), async (c) => {
  const { email, code, username, inviteCode } = c.req.valid("json");

  let claudeOpsData: ClaudeOpsVerifyData | null;
  try {
    claudeOpsData = await proxyClaudeOpsVerifyCode(email, code);
  } catch (error) {
    if (error instanceof ClaudeOpsProxyError) {
      return c.json(error.response, { status: error.status as any });
    }
    throw error;
  }

  if (!claudeOpsData) {
    return c.json({ success: false, error: "ClaudeOps service unavailable" }, 502);
  }

  let user: CommunityUser;
  try {
    user = await autolinkClaudeOpsUser(claudeOpsData.user, { usernameHint: username });
  } catch (error) {
    if (error instanceof UsernameConflictError) {
      return c.json({ success: false, error: error.message }, 409);
    }
    throw error;
  }

  if (inviteCode) {
    try {
      await bindInviteCodeToUser(user.id, inviteCode);
    } catch (error) {
      console.warn("[auth/verify-code] failed to bind invite code:", {
        userId: user.id,
        inviteCode,
        error,
      });
    }
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  return c.json({ success: true, data: { user: sanitizeUser(user), token } });
});

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const claudeOpsData = await proxyClaudeOpsLogin(email, password);
  if (claudeOpsData) {
    const user = await autolinkClaudeOpsUser(claudeOpsData.user);
    const token = signToken({ userId: user.id, username: user.username, role: user.role });
    return c.json({ success: true, data: { user: sanitizeUser(user), token } });
  }

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

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  return c.json({ success: true, data: { user: sanitizeUser(user), token } });
});

authRoutes.post("/github", async (c) => {
  const { code } = await c.req.json<{ code: string }>();
  if (!code) {
    return c.json({ success: false, error: "GitHub code is required" }, 400);
  }

  const env = getEnv();

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

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  if (!user) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
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
