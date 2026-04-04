import { z } from 'zod';
import { workflowContentSchema } from './workflow.schema';
import { skillContentSchema } from './skill.schema';
import { teamContentSchema } from './team.schema';
import { mcpContentSchema } from './mcp.schema';
import { reviewStatusSchema } from './review.schema';

/**
 * Resource type enum schema - matches ResourceType enum in types/resource.ts
 */
export const resourceTypeSchema = z.enum(['workflow', 'team', 'skill', 'mcp']);

/**
 * Source app enum schema - identifies which application created the resource
 */
export const sourceAppSchema = z.enum(['community', 'claudeops']).default('community');

/**
 * Resource creation input schema
 * Validates name (1-100 chars), description (1-1000 chars), type, content, tags, and version
 */
export const createResourceInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  type: resourceTypeSchema,
  content: z.union([workflowContentSchema, skillContentSchema, teamContentSchema, mcpContentSchema]),
  tags: z.array(z.string()).nullable().optional().default([]),
  version: z.string().default('1.0.0'),
  isPublished: z.boolean().default(false),
  reviewStatus: reviewStatusSchema.optional(),
  sourceApp: sourceAppSchema.optional(),
});

/**
 * Resource update input schema - all fields optional
 */
export const updateResourceInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).nullable().optional(),
  content: z.union([workflowContentSchema, skillContentSchema, teamContentSchema, mcpContentSchema]).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  version: z.string().optional(),
  isPublished: z.boolean().optional(),
  reviewStatus: reviewStatusSchema.optional(),
  sourceApp: sourceAppSchema.optional(),
});

/**
 * Author info schema for public resources
 */
export const authorSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

/**
 * Public resource schema - used for API responses
 * Includes author info, stats (downloads, likes), and timestamps
 */
export const publicResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: resourceTypeSchema,
  content: z.union([workflowContentSchema, skillContentSchema, teamContentSchema, mcpContentSchema]),
  author: authorSchema,
  isPublished: z.boolean().default(false),
  downloads: z.number().default(0),
  likes: z.number().default(0),
  tags: z.array(z.string()).nullable().default([]),
  version: z.string(),
  reviewStatus: reviewStatusSchema,
  sourceApp: sourceAppSchema,
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

// Type exports
export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceInputSchema>;
export type PublicResource = z.infer<typeof publicResourceSchema>;