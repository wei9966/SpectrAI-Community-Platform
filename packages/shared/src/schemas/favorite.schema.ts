import { z } from 'zod';

/**
 * Toggle favorite schema
 */
export const toggleFavoriteSchema = z.object({
  resourceId: z.string().uuid(),
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
