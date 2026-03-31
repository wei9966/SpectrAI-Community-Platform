import { z } from 'zod';

// ── Query param schemas ─────────────────────────────────────
export const rankingPeriodSchema = z.enum(['week', 'month', 'all']).default('all');
export const resourceSortSchema = z.enum(['rating', 'downloads', 'favorites']).default('rating');
export const userSortSchema = z.enum(['contributions', 'reputation']).default('contributions');

export const resourceRankingQuerySchema = z.object({
  period: rankingPeriodSchema,
  sort: resourceSortSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userRankingQuerySchema = z.object({
  period: rankingPeriodSchema,
  sort: userSortSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const projectRankingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Response item schemas ───────────────────────────────────
export const rankedResourceSchema = z.object({
  rank: z.number(),
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  tags: z.array(z.string()).nullable(),
  downloads: z.number(),
  likes: z.number(),
  averageRating: z.number(),
  ratingCount: z.number(),
  favoriteCount: z.number(),
  score: z.number(),
  author: z.object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  createdAt: z.string(),
});

export const rankedUserSchema = z.object({
  rank: z.number(),
  id: z.string().uuid(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  score: z.number(),
  resourceCount: z.number(),
  commentCount: z.number(),
  averageRating: z.number(),
});

export const rankedProjectSchema = z.object({
  rank: z.number(),
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  coverImage: z.string().nullable(),
  score: z.number(),
  author: z.object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  createdAt: z.string(),
});

// ── Type exports ────────────────────────────────────────────
export type RankingPeriod = z.infer<typeof rankingPeriodSchema>;
export type ResourceRankingQuery = z.infer<typeof resourceRankingQuerySchema>;
export type UserRankingQuery = z.infer<typeof userRankingQuerySchema>;
export type RankedResource = z.infer<typeof rankedResourceSchema>;
export type RankedUser = z.infer<typeof rankedUserSchema>;
export type RankedProject = z.infer<typeof rankedProjectSchema>;
