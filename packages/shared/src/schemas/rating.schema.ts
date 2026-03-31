import { z } from 'zod';

/**
 * Create rating schema - rating must be 1-5
 */
export const createRatingSchema = z.object({
  resourceId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
