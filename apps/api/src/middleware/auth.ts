import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
const { verify } = jwt;
import { eq } from "drizzle-orm";
import { getEnv } from "../config/env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

// ── Community-native JWT payload ──────────────────────────────
export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

// ── ClaudeOps JWT payload (HS256) ─────────────────────────────
export interface ClaudeOpsJwtPayload {
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
  sub: string; // ClaudeOps user UUID
  type: "access";
  email: string;
  plan: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

function getClaudeOpsSecret(): string {
  const env = getEnv();
  return env.CLAUDEOPS_JWT_SECRET || env.JWT_SECRET;
}

/**
 * Verify token: try community secret first, then ClaudeOps secret.
 */
function verifyToken(token: string): unknown {
  try {
    return verify(token, getEnv().JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    const claudeOpsSecret = getClaudeOpsSecret();
    if (claudeOpsSecret !== getEnv().JWT_SECRET) {
      return verify(token, claudeOpsSecret, { algorithms: ["HS256"] });
    }
    throw new Error("Invalid token");
  }
}

/**
 * Detect whether a decoded JWT is a ClaudeOps access token.
 */
function isClaudeOpsToken(payload: unknown): payload is ClaudeOpsJwtPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as Record<string, unknown>).type === "access" &&
    typeof (payload as Record<string, unknown>).sub === "string"
  );
}

/**
 * Resolve a ClaudeOps token to a Community JwtPayload by looking up
 * the linked user via claudeops_uuid.
 */
async function resolveClaudeOpsUser(
  payload: ClaudeOpsJwtPayload
): Promise<JwtPayload | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.claudeopsUuid, payload.sub))
    .limit(1);

  if (!user) return null;

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
  };
}

/**
 * JWT authentication middleware.
 * Supports both Community-native tokens and ClaudeOps access tokens.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const raw = verifyToken(token);

    if (isClaudeOpsToken(raw)) {
      const communityUser = await resolveClaudeOpsUser(raw);
      if (!communityUser) {
        return c.json(
          {
            success: false,
            error: "ClaudeOps account not linked. Please link your account first via POST /api/auth/claudeops/link",
          },
          403
        );
      }
      c.set("user", communityUser);
    } else {
      c.set("user", raw as JwtPayload);
    }

    await next();
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }
}

/**
 * Optional auth middleware — sets user if token present, but does not block.
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const raw = verifyToken(token);

      if (isClaudeOpsToken(raw)) {
        const communityUser = await resolveClaudeOpsUser(raw);
        if (communityUser) {
          c.set("user", communityUser);
        }
      } else {
        c.set("user", raw as JwtPayload);
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  await next();
}
