/**
 * ClaudeOps JWT access token payload (HS256).
 * Issued by ClaudeOps API — shares the same JWT secret as Community.
 */
export interface ClaudeOpsJwtPayload {
  iss: string; // e.g. "claudeops.wbdao.cn"
  iat: number;
  nbf: number;
  exp: number;
  sub: string; // ClaudeOps user UUID
  type: "access";
  email: string;
  plan: string; // e.g. "free", "pro", "team"
}

/**
 * ClaudeOps plan tiers (mirrors ClaudeOps backend).
 */
export type ClaudeOpsPlan = "free" | "pro" | "team" | "enterprise";

/**
 * Payload returned by POST /auth/claudeops/link
 */
export interface ClaudeOpsLinkResult {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    claudeopsUuid: string;
    claudeopsPlan: string;
  };
  token: string; // Community JWT
  isNewUser: boolean;
}

/**
 * A local resource in ClaudeOps desktop format, used for cross-publish.
 */
export interface ClaudeOpsLocalResource {
  id: string;
  name: string;
  type: "skill" | "mcp" | "workflow" | "team";
  description: string;
  version: string;
  content: Record<string, unknown>;
  tags?: string[];
}
