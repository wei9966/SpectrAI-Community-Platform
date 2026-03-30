import { z } from 'zod';

/**
 * Skill content schema
 */
export const skillVariableSchema = z.object({
  name: z.string(),
  type: z.string(),
  defaultValue: z.string().optional(),
});

export const skillContentSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  command: z.string(),
  promptTemplate: z.string(),
  variables: z.array(skillVariableSchema).optional(),
});

export type SkillContent = z.infer<typeof skillContentSchema>;