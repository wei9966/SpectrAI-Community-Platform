import { z } from 'zod';

/**
 * Forum category schema
 * Matches forum_categories table structure
 */
export const forumCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().or(z.date()),
});

/**
 * Create category input schema
 */
export const createCategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

/**
 * Update category input schema
 */
export const updateCategoryInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * Forum post schema
 * Matches forum_posts table structure
 */
export const forumPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  categoryId: z.string().uuid(),
  userId: z.string().uuid(),
  isPinned: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  viewCount: z.number().int().nonnegative().default(0),
  replyCount: z.number().int().nonnegative().default(0),
  voteScore: z.number().int().default(0),
  bestAnswerId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

/**
 * Create post input schema
 */
export const createPostInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional(),
});

/**
 * Update post input schema
 */
export const updatePostInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Forum reply schema
 * Matches forum_replies table structure
 */
export const forumReplySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  voteScore: z.number().int().default(0),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

/**
 * Create reply input schema
 */
export const createReplyInputSchema = z.object({
  content: z.string().min(1),
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
});

/**
 * Update reply input schema
 */
export const updateReplyInputSchema = z.object({
  content: z.string().min(1).optional(),
});

/**
 * Forum vote schema
 * Matches forum_votes table structure
 * value: 1 for upvote, -1 for downvote
 */
export const forumVoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  postId: z.string().uuid().nullable().optional(),
  replyId: z.string().uuid().nullable().optional(),
  value: z.number().int().refine((val) => val === 1 || val === -1, {
    message: 'Value must be 1 (upvote) or -1 (downvote)',
  }),
  createdAt: z.string().or(z.date()),
});

/**
 * Create vote input schema
 */
export const createVoteInputSchema = z.object({
  targetType: z.enum(['post', 'reply']),
  targetId: z.string().uuid(),
  value: z.number().int().refine((val) => val === 1 || val === -1, {
    message: 'Value must be 1 (upvote) or -1 (downvote)',
  }),
});

/**
 * Forum post with author and category info
 */
export const forumPostWithRelationsSchema = forumPostSchema.extend({
  author: z.object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }),
  category: forumCategorySchema,
  replies: z.array(forumReplySchema).default([]),
});

/**
 * Paginated response schema
 */
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  });

// Type exports
export type ForumCategory = z.infer<typeof forumCategorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
export type ForumPost = z.infer<typeof forumPostSchema>;
export type CreatePostInput = z.infer<typeof createPostInputSchema>;
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;
export type ForumReply = z.infer<typeof forumReplySchema>;
export type CreateReplyInput = z.infer<typeof createReplyInputSchema>;
export type UpdateReplyInput = z.infer<typeof updateReplyInputSchema>;
export type ForumVote = z.infer<typeof forumVoteSchema>;
export type CreateVoteInput = z.infer<typeof createVoteInputSchema>;
export type ForumPostWithRelations = z.infer<typeof forumPostWithRelationsSchema>;
