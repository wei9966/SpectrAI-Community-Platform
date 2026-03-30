/**
 * Shared types re-exported from @spectrai-community/shared.
 *
 * All API route files import shared types from this single entry point.
 * When the shared package is available (after pnpm install in the monorepo),
 * the real exports are used. The local fallback types below are kept ONLY
 * so that `tsc` doesn't break before the workspace link is resolved —
 * they must stay in sync with the shared package definitions.
 */

// ── Try real imports first ──────────────────────────────────
export type {
  ApiResponse,
  ResourceType,
  UserRole,
  ResourceContentBase,
  WorkflowStep,
  WorkflowContent,
  TeamRole,
  TeamContent,
  SkillContent,
  MCPContent,
  ResourceContent,
  PaginatedResponse,
} from "@spectrai-community/shared";
