import { z } from 'zod';

/**
 * Workflow content schema
 */
export const workflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  config: z.record(z.unknown()),
});

export const workflowTriggerSchema = z.object({
  type: z.string(),
  config: z.record(z.unknown()),
});

export const workflowVariableSchema = z.object({
  name: z.string(),
  type: z.string(),
  defaultValue: z.string().optional(),
});

export const workflowContentSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(workflowStepSchema),
  triggers: z.array(workflowTriggerSchema).optional(),
  variables: z.array(workflowVariableSchema).optional(),
});

export type WorkflowContent = z.infer<typeof workflowContentSchema>;