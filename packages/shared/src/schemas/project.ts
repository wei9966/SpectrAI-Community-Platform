import { z } from 'zod';

/**
 * Project status enum schema
 */
export const projectStatusSchema = z.enum(['draft', 'published', 'archived']);

/**
 * Tool chain item schema for projects
 */
export const toolChainItemSchema = z.object({
  name: z.string(),
  type: z.enum(['workflow', 'skill', 'team', 'mcp']),
  resourceId: z.string().uuid().optional(),
  version: z.string().optional(),
});

/**
 * Project schema
 * Matches projects table structure
 */
export const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  demoUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  userId: z.string().uuid(),
  status: projectStatusSchema.default('published'),
  toolChain: z.array(toolChainItemSchema).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

/**
 * Create project input schema (without id and timestamps)
 */
export const createProjectInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  demoUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  status: projectStatusSchema.default('published'),
  toolChain: z.array(toolChainItemSchema).optional(),
  tags: z.array(z.string()).optional(),
  resourceIds: z.array(z.string().uuid()).optional(),
});

/**
 * Update project input schema (all fields optional)
 */
export const updateProjectInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  demoUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  status: projectStatusSchema.optional(),
  toolChain: z.array(toolChainItemSchema).optional(),
  tags: z.array(z.string()).optional(),
  resourceIds: z.array(z.string().uuid()).optional(),
});

/**
 * Project with relations schema
 */
export const projectWithRelationsSchema = projectSchema.extend({
  resources: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['workflow', 'team', 'skill', 'mcp']),
  })).default([]),
});

// Type exports
export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type ProjectWithRelations = z.infer<typeof projectWithRelationsSchema>;
export type ToolChainItem = z.infer<typeof toolChainItemSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
