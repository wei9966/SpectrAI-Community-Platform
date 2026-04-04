import { z } from 'zod';

/**
 * Review status enum schema - matches ReviewStatus enum in types/review.ts
 */
export const reviewStatusSchema = z.enum(['draft', 'pending', 'approved', 'rejected']).default('draft');

/**
 * Review action enum schema - matches ReviewAction enum in types/review.ts
 */
export const reviewActionSchema = z.enum(['approve', 'reject']);

/**
 * Reviewer role enum schema - matches ReviewerRole enum in types/review.ts
 */
export const reviewerRoleSchema = z.enum(['admin', 'moderator']);

/**
 * Resource publish log entry schema
 */
export const resourcePublishLogSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  action: reviewActionSchema,
  previousStatus: reviewStatusSchema.nullable(),
  newStatus: reviewStatusSchema,
  note: z.string().nullable(),
  executedBy: z.string(),
  executedAt: z.date().or(z.string()),
});

/**
 * Reviewer info schema
 */
export const reviewerInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

/**
 * Review detail response schema - used for GET /admin/review/:id
 */
export const reviewDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.string(),
  reviewStatus: reviewStatusSchema,
  reviewNote: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedByUser: reviewerInfoSchema.nullable(),
  reviewedAt: z.date().or(z.string()).nullable(),
  author: reviewerInfoSchema,
  publishLog: z.array(resourcePublishLogSchema),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

/**
 * Pending review item schema - used for GET /admin/review/pending
 */
export const pendingReviewItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.string(),
  reviewStatus: reviewStatusSchema,
  author: reviewerInfoSchema,
  version: z.string(),
  createdAt: z.date().or(z.string()),
});

/**
 * Review queue response schema
 */
export const reviewQueueResponseSchema = z.object({
  items: z.array(pendingReviewItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

/**
 * Review queue query parameters schema
 */
export const reviewQueueParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Approve review input schema
 */
export const approveReviewSchema = z.object({});

/**
 * Reject review input schema
 */
export const rejectReviewSchema = z.object({
  note: z.string().min(1).max(1000),
});

// Type exports
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ReviewAction = z.infer<typeof reviewActionSchema>;
export type ReviewerRole = z.infer<typeof reviewerRoleSchema>;
export type ResourcePublishLog = z.infer<typeof resourcePublishLogSchema>;
export type ReviewDetail = z.infer<typeof reviewDetailSchema>;
export type PendingReviewItem = z.infer<typeof pendingReviewItemSchema>;
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;
export type ReviewQueueParams = z.infer<typeof reviewQueueParamsSchema>;
