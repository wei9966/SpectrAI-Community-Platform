import { z } from 'zod';

/**
 * MCP server content schema
 */
export const mcpContentSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export type MCPContent = z.infer<typeof mcpContentSchema>;