import { z } from 'zod';

/**
 * Resource favorite schema
 * Matches resource_favorites table structure
 */
export const resourceFavoriteSchema = z.object({
  id: z.string().uuid(),
  resourceId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string().or(z.date()),
});

/**
 * Create favorite input schema (without id and timestamps)
 */
export const createFavoriteInputSchema = z.object({
  resourceId: z.string().uuid(),
});

/**
 * Toggle favorite response schema
 */
export const toggleFavoriteResponseSchema = z.object({
  success: z.boolean(),
  isFavorite: z.boolean(),
  favoriteCount: z.number().int().nonnegative().default(0),
});

// Type exports
export type ResourceFavorite = z.infer<typeof resourceFavoriteSchema>;
export type CreateFavoriteInput = z.infer<typeof createFavoriteInputSchema>;
export type ToggleFavoriteResponse = z.infer<typeof toggleFavoriteResponseSchema>;
