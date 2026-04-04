import { z } from "zod";

/**
 * Publish request schema for desktop resources
 * Validates resources coming from ClaudeOps desktop app
 */

// Desktop skill input variables schema
const desktopSkillInputVariableSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
});

// Desktop skill schema
const desktopSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  slashCommand: z.string(),
  type: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(), // JSON string
  promptTemplate: z.string(),
  inputVariables: z.string().optional(), // JSON string
  systemPromptAddition: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

// Desktop MCP schema
const desktopMCPSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  transport: z.enum(["stdio", "http", "sse"]).optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
  envVars: z.record(z.string()).optional(),
});

// Desktop workflow schema
const desktopWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  definition: z.object({
    nodes: z.array(z.unknown()).optional(),
    edges: z.array(z.unknown()).optional(),
    triggers: z.array(z.unknown()).optional(),
    variables: z.array(z.unknown()).optional(),
  }).optional(),
}).catchall(z.unknown().optional());

// Desktop team schema
const desktopTeamSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  roles: z.array(z.object({
    roleName: z.string(),
    displayName: z.string().optional(),
    systemPrompt: z.string(),
    permissions: z.array(z.string()).optional(),
  })),
}).catchall(z.unknown().optional());

// Union of all desktop resource types
export const desktopResourceSchema = z.discriminatedUnion("type", [
  desktopSkillSchema.extend({ type: z.literal("skill") }),
  desktopMCPSchema.extend({ type: z.literal("mcp") }),
  desktopWorkflowSchema.extend({ type: z.literal("workflow") }),
  desktopTeamSchema.extend({ type: z.literal("team") }),
]);

export type DesktopResource = z.infer<typeof desktopResourceSchema>;

/**
 * Publish request schema
 * Desktop resources are published to community with pending review status
 */
export const publishRequestSchema = z.object({
  resource: desktopResourceSchema,
  metadata: z.object({
    sourceApp: z.string().default("desktop"),
    publishedBy: z.string().optional(), // Desktop user identifier
    publishedAt: z.string().datetime().optional(),
  }).optional(),
});

export type PublishRequest = z.infer<typeof publishRequestSchema>;

/**
 * Publish response schema
 */
export const publishResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["workflow", "team", "skill", "mcp"]),
  reviewStatus: z.enum(["draft", "pending", "approved", "rejected"]),
  sourceApp: z.string(),
  createdAt: z.string().or(z.date()),
});

export type PublishResponse = z.infer<typeof publishResponseSchema>;
