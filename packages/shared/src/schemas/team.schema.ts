import { z } from 'zod';

/**
 * Team content schema
 */
export const teamRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
});

export const teamContentSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  roles: z.array(teamRoleSchema),
});

export type TeamContent = z.infer<typeof teamContentSchema>;