import { z } from 'zod';

/**
 * Create post schema
 */
export const createPostSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

/**
 * Update post schema
 */
export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  isResolved: z.boolean().optional(),
  acceptedReplyId: z.string().uuid().nullable().optional(),
});

/**
 * Create reply schema
 */
export const createReplySchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().min(1).max(50000),
});

/**
 * Vote schema
 */
export const voteSchema = z.object({
  value: z.enum(['up', 'down', 'none']),
  postId: z.string().uuid().nullable().optional(),
  replyId: z.string().uuid().nullable().optional(),
}).refine(
  (data) => (data.postId !== undefined) !== (data.replyId !== undefined),
  { message: 'Must provide either postId or replyId, but not both' }
);

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type VoteInput = z.infer<typeof voteSchema>;
