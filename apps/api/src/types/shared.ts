/**
 * Re-exports from @spectrai-community/shared.
 *
 * This file acts as a bridge so all API route files import shared types
 * from one place. Once the shared package is merged and available,
 * switch these to real imports:
 *
 *   export type { ApiResponse, ResourceType, UserRole, ... } from "@spectrai-community/shared";
 */

// ── API Response ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Enums (must match shared package) ───────────────────────
export type ResourceType = "workflow" | "team" | "skill" | "mcp";
export type UserRole = "user" | "admin" | "moderator";

// ── Resource Content Types (must match shared package) ──────

/** Base fields shared by all resource content types */
export interface ResourceContentBase {
  name: string;
  description: string;
  version: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

export interface WorkflowContent extends ResourceContentBase {
  steps: WorkflowStep[];
}

export interface TeamRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface TeamContent extends ResourceContentBase {
  roles: TeamRole[];
}

export interface SkillContent extends ResourceContentBase {
  command: string;
  promptTemplate: string;
  variables?: Record<string, string>;
}

export interface MCPContent extends ResourceContentBase {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type ResourceContent =
  | WorkflowContent
  | TeamContent
  | SkillContent
  | MCPContent;

// ── Resource ────────────────────────────────────────────────
export interface Resource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  content: ResourceContent;
  authorId: string;
  downloads: number;
  likes: number;
  tags: string[] | null;
  version: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── User (public) ───────────────────────────────────────────
export interface PublicUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

// ── Pagination ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
