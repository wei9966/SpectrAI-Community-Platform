import { Context, Next } from "hono";
import { verify } from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

/**
 * JWT authentication middleware.
 * Extracts and verifies Bearer token from Authorization header.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = verify(token, getEnv().JWT_SECRET) as JwtPayload;
    c.set("user", payload);
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
      const payload = verify(token, getEnv().JWT_SECRET) as JwtPayload;
      c.set("user", payload);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  await next();
}
