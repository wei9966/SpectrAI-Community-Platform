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

// ── Resource ────────────────────────────────────────────────
export interface Resource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  content: unknown;
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
