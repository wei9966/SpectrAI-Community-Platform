import { z } from 'zod';

/**
 * Resource rating schema (1-5 stars)
 * Matches resource_ratings table structure
 */
export const resourceRatingSchema = z.object({
  id: z.string().uuid(),
  resourceId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

/**
 * Create rating input schema (without id and timestamps)
 */
export const createRatingInputSchema = z.object({
  resourceId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

/**
 * Update rating input schema (rating is optional)
 */
export const updateRatingInputSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
});

/**
 * Resource rating statistics schema
 */
export const resourceRatingStatsSchema = z.object({
  averageRating: z.number().nonnegative().default(0),
  ratingCount: z.number().int().nonnegative().default(0),
  distribution: z.record(z.string(), z.number()).default({}),
});

// Type exports
export type ResourceRating = z.infer<typeof resourceRatingSchema>;
export type CreateRatingInput = z.infer<typeof createRatingInputSchema>;
export type UpdateRatingInput = z.infer<typeof updateRatingInputSchema>;
export type ResourceRatingStats = z.infer<typeof resourceRatingStatsSchema>;
