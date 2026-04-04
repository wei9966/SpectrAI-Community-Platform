/**
 * Review status enumeration - defines the lifecycle states of a resource under review
 */
export enum ReviewStatus {
  /** Resource is being edited and not yet submitted for review */
  DRAFT = 'draft',
  /** Resource is waiting for admin/moderator review */
  PENDING = 'pending',
  /** Resource has been approved and is visible to public */
  APPROVED = 'approved',
  /** Resource has been rejected by reviewer */
  REJECTED = 'rejected',
}

/**
 * Review action enumeration - actions that can be taken by reviewers
 */
export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

/**
 * Reviewer role enumeration
 */
export enum ReviewerRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

/**
 * Resource publish log entry - tracks all review-related actions
 */
export interface ResourcePublishLog {
  id: string;
  resourceId: string;
  action: ReviewAction;
  previousStatus: ReviewStatus | null;
  newStatus: ReviewStatus;
  note: string | null;
  executedBy: string;
  executedAt: Date;
}

/**
 * Review detail with reviewer info
 */
export interface ReviewDetail {
  id: string;
  name: string;
  description: string;
  type: string;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedByUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  reviewedAt: Date | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  publishLog: ResourcePublishLog[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pending review item - used for review queue listing
 */
export interface PendingReviewItem {
  id: string;
  name: string;
  description: string;
  type: string;
  reviewStatus: ReviewStatus;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  version: string;
  createdAt: Date;
}

/**
 * Review approval input
 */
export interface ApproveReviewInput {
  resourceId: string;
}

/**
 * Review rejection input
 */
export interface RejectReviewInput {
  resourceId: string;
  note: string;
}

/**
 * Review queue query parameters
 */
export interface ReviewQueueParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Review queue response
 */
export interface ReviewQueueResponse {
  items: PendingReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
