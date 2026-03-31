import { z } from 'zod';

/**
 * Create project schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().default(false),
});

/**
 * Update project schema
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
});

/**
 * Add resource to project schema
 */
export const addProjectResourceSchema = z.object({
  resourceId: z.string().uuid(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectResourceInput = z.infer<typeof addProjectResourceSchema>;
