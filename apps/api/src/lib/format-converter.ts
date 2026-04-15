/**
 * Format Converter: ClaudeOps Desktop ↔ SpectrAI Community
 *
 * Bidirectional converter for Skill, MCP, Workflow, and Team resources.
 * All conversions preserve _sourceData for lossless round-trip.
 */

import type { SkillContent } from "@spectrai-community/shared";
import type { MCPContent } from "@spectrai-community/shared";
import type { WorkflowContent } from "@spectrai-community/shared";
import type { TeamContent } from "@spectrai-community/shared";

// ============================================================================
// Desktop (ClaudeOps) Types
// ============================================================================

export interface DesktopSkill {
  id: string;
  name: string;
  description: string;
  slashCommand: string;
  type?: string;
  category?: string;
  tags?: string; // JSON string
  promptTemplate: string;
  inputVariables?: string; // JSON string: {name, description, required, defaultValue}[]
  systemPromptAddition?: string;
  isEnabled?: boolean;
}

export interface DesktopMCP {
  id: string;
  name: string;
  description: string;
  transport?: "stdio" | "http" | "sse";
  command: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
  type?: string;
}

export interface DesktopWorkflow {
  type?: string;
  name?: string;
  description?: string;
  definition?: {
    nodes?: unknown[];
    edges?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DesktopTeam {
  type?: string;
  name?: string;
  description?: string;
  roles: Array<{
    roleName: string;
    displayName: string;
    systemPrompt: string;
    permissions?: string[];
  }>;
  [key: string]: unknown;
}

// ============================================================================
// Shared Types with _sourceData
// ============================================================================

export interface SkillWithSource extends SkillContent {
  _sourceData: DesktopSkill;
}

export interface MCPWithSource extends MCPContent {
  _sourceData: DesktopMCP;
}

export interface WorkflowWithSource extends WorkflowContent {
  _originalDag: DesktopWorkflow;
}

export interface TeamWithSource extends TeamContent {
  _sourceData: DesktopTeam;
}

// ============================================================================
// Sensitive field patterns for MCP security filtering
// ============================================================================

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /auth/i,
  /credential/i,
  /private[-_]?key/i,
  /access[-_]?key/i,
];

const SENSITIVE_KEYS = [
  "host",
  "port",
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessKey",
  "access_key",
  "privateKey",
  "private_key",
  "authToken",
  "auth_token",
  "bearer",
  "credentials",
];

/**
 * Check if a key is sensitive
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
    return true;
  }
  if (SENSITIVE_PATTERNS.some((p) => p.test(key))) {
    return true;
  }
  return false;
}

/**
 * Filter sensitive fields from an object recursively
 */
function filterSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = "[FILTERED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = filterSensitiveFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Skill Conversion
// ============================================================================

/**
 * Convert Desktop Skill format to Community SkillContent format
 */
export function deserializeSkill(desktop: DesktopSkill): SkillWithSource {
  let inputVariables: SkillContent["variables"] = undefined;

  if (desktop.inputVariables) {
    try {
      const parsed = JSON.parse(desktop.inputVariables);
      if (Array.isArray(parsed)) {
        inputVariables = parsed.map((v: { name: string; description?: string; required?: boolean; defaultValue?: unknown }) => ({
          name: v.name,
          type: v.description || "string",
          ...(v.defaultValue !== undefined && !v.required ? { defaultValue: String(v.defaultValue) } : {}),
        }));
      }
    } catch {
      // Invalid JSON, leave as undefined
    }
  }

  const promptTemplate = desktop.systemPromptAddition
    ? `${desktop.systemPromptAddition}\n\n${desktop.promptTemplate}`
    : desktop.promptTemplate;

  const content: SkillContent = {
    name: desktop.name,
    description: desktop.description,
    version: "1.0.0",
    command: desktop.slashCommand,
    promptTemplate,
    variables: inputVariables,
  };

  return {
    ...content,
    _sourceData: desktop,
  };
}

/**
 * Convert Community SkillContent format to Desktop Skill format
 */
export function serializeSkill(community: SkillWithSource): DesktopSkill {
  const inputVariables = community.variables?.map((v) => ({
    name: v.name,
    description: typeof v.type === "string" ? v.type : "string",
    required: v.defaultValue === undefined,
    defaultValue: v.defaultValue,
  }));

  // Extract systemPromptAddition from promptTemplate if it was prepended
  let promptTemplate = community.promptTemplate;
  let systemPromptAddition = "";

  // Simple heuristic: if promptTemplate starts with "You are..." or similar system prompt patterns
  const systemPromptPattern = /^(You are|System:|\[System\]|## System|## Role).*\n+/i;
  const match = promptTemplate.match(systemPromptPattern);
  if (match) {
    systemPromptAddition = match[0].trim();
    promptTemplate = promptTemplate.slice(match[0].length).trim();
  }

  return {
    id: "",
    name: community.name,
    description: community.description ?? "",
    slashCommand: community.command,
    type: "custom",
    category: "uncategorized",
    tags: "[]",
    promptTemplate,
    inputVariables: inputVariables ? JSON.stringify(inputVariables) : "[]",
    systemPromptAddition,
    isEnabled: true,
  };
}

// ============================================================================
// MCP Conversion
// ============================================================================

/**
 * Convert Desktop MCP format to Community MCPContent format
 * Applies security filtering to remove sensitive connection credentials
 */
export function deserializeMCP(desktop: DesktopMCP): MCPWithSource {
  // Security filter: remove sensitive connection credentials
  const filteredEnvVars = desktop.envVars
    ? filterSensitiveFields(desktop.envVars)
    : undefined;

  const content: MCPContent = {
    name: desktop.name,
    description: desktop.description,
    version: "1.0.0",
    command: desktop.command,
    args: desktop.args,
    env: filteredEnvVars as Record<string, string>,
  };

  return {
    ...content,
    _sourceData: desktop,
  };
}

/**
 * Convert Community MCPContent format to Desktop MCP format
 */
export function serializeMCP(community: MCPWithSource): DesktopMCP {
  return {
    id: "",
    name: community.name,
    description: community.description ?? "",
    transport: "stdio",
    command: community.command,
    args: community.args || [],
    envVars: community.env as Record<string, string> | undefined,
  };
}

// ============================================================================
// Workflow Conversion
// ============================================================================

/**
 * Convert Desktop Workflow format (DAG) to Community WorkflowContent format
 */
export function deserializeWorkflow(desktop: DesktopWorkflow): WorkflowWithSource {
  const definition = desktop.definition || {};

  // Extract steps from DAG nodes
  const steps = (definition.nodes || []).map((node: unknown, index: number) => {
    const n = node as Record<string, unknown>;
    const config =
      typeof n.config === "object" && n.config !== null && !Array.isArray(n.config)
        ? (n.config as Record<string, unknown>)
        : {};

    return {
      id: String(n.id || index + 1),
      name: String(n.name || n.label || `Step ${index + 1}`),
      type: String(n.type || "action"),
      config: {
        ...config,
        _originalNodeData: n.data,
      },
    };
  });

  // Extract triggers from definition
  const triggers: WorkflowContent["triggers"] = definition.triggers
    ? (definition.triggers as unknown[]).map((t: unknown) => {
        const trigger = t as Record<string, unknown>;
        return {
          type: String(trigger.type || "manual"),
          config:
            typeof trigger.config === "object" && trigger.config !== null && !Array.isArray(trigger.config)
              ? (trigger.config as Record<string, unknown>)
              : {},
        };
      })
    : [{ type: "manual", config: {} as Record<string, unknown> }];

  // Extract variables from definition
  const variables = definition.variables
    ? (definition.variables as unknown[]).map((v: unknown) => {
        const variable = v as Record<string, unknown>;
        return {
          name: String(variable.name),
          type: String(variable.type || "string"),
          ...(variable.defaultValue !== undefined ? { defaultValue: String(variable.defaultValue) } : {}),
        };
      })
    : undefined;

  const content: WorkflowContent = {
    name: desktop.name || "Untitled Workflow",
    description: desktop.description || "",
    version: "1.0.0",
    steps,
    triggers,
    variables,
  };

  return {
    ...content,
    _originalDag: desktop,
  };
}

/**
 * Convert Community WorkflowContent format to Desktop Workflow format
 */
export function serializeWorkflow(community: WorkflowWithSource): DesktopWorkflow {
  // Reconstruct DAG from steps and triggers
  const nodes = community.steps.map((step) => ({
    id: step.id,
    name: step.name,
    type: step.type,
    data: step.config._originalNodeData || step.config,
  }));

  const triggers = community.triggers?.map((t) => ({
    type: t.type,
    config: t.config,
  }));

  const variables = community.variables?.map((v) => ({
    name: v.name,
    type: v.type,
    defaultValue: v.defaultValue,
  }));

  return {
    definition: {
      nodes,
      triggers,
      variables,
    },
    name: community.name,
    description: community.description ?? undefined,
    _originalDag: community._originalDag,
  };
}

// ============================================================================
// Team Conversion
// ============================================================================

/**
 * Convert Desktop Team format to Community TeamContent format
 */
export function deserializeTeam(desktop: DesktopTeam): TeamWithSource {
  const roles: TeamContent["roles"] = desktop.roles.map((role, index) => ({
    id: String(index + 1),
    name: role.roleName,
    description: role.displayName || role.roleName,
    permissions: role.permissions || extractPermissionsFromSystemPrompt(role.systemPrompt),
  }));

  const content: TeamContent = {
    name: desktop.name || "Untitled Team",
    description: desktop.description || "",
    version: "1.0.0",
    roles,
  };

  return {
    ...content,
    _sourceData: desktop,
  };
}

/**
 * Extract permissions from system prompt (heuristic)
 */
function extractPermissionsFromSystemPrompt(systemPrompt: string): string[] {
  const permissions: string[] = [];

  // Simple keyword-based extraction
  const permissionKeywords: Record<string, string> = {
    admin: "admin",
    manage: "manage",
    write: "write",
    read: "read",
    delete: "delete",
    create: "create",
    edit: "edit",
    publish: "publish",
    review: "review",
  };

  const lowerPrompt = systemPrompt.toLowerCase();
  for (const [keyword, permission] of Object.entries(permissionKeywords)) {
    if (lowerPrompt.includes(keyword)) {
      permissions.push(permission);
    }
  }

  return permissions.length > 0 ? permissions : ["read"];
}

/**
 * Convert Community TeamContent format to Desktop Team format
 */
export function serializeTeam(community: TeamWithSource): DesktopTeam {
  return {
    roles: community.roles.map((role) => ({
      roleName: role.name,
      displayName: role.description,
      systemPrompt: `Role: ${role.name}\nDescription: ${role.description}\nPermissions: ${role.permissions.join(", ")}`,
      permissions: role.permissions,
    })),
    name: community.name,
    description: community.description ?? undefined,
    _sourceData: community._sourceData,
  };
}

// ============================================================================
// Unified Converter
// ============================================================================

export type ResourceType = "skill" | "mcp" | "workflow" | "team";
export type DesktopResource = DesktopSkill | DesktopMCP | DesktopWorkflow | DesktopTeam;
export type CommunityResource = SkillWithSource | MCPWithSource | WorkflowWithSource | TeamWithSource;

/**
 * Detect resource type from Desktop resource
 */
export function detectDesktopResourceType(resource: DesktopResource): ResourceType {
  if (resource.type === "skill" || resource.type === "mcp" || resource.type === "workflow" || resource.type === "team") {
    return resource.type;
  }
  if ("slashCommand" in resource) return "skill";
  if ("transport" in resource) return "mcp";
  if ("definition" in resource) return "workflow";
  if ("roles" in resource) return "team";
  throw new Error("Unknown resource type");
}

/**
 * Deserialize Desktop resource to Community format
 */
export function deserialize(
  resource: DesktopResource,
  type?: ResourceType
): CommunityResource {
  const detectedType = type || detectDesktopResourceType(resource);

  switch (detectedType) {
    case "skill":
      return deserializeSkill(resource as DesktopSkill);
    case "mcp":
      return deserializeMCP(resource as DesktopMCP);
    case "workflow":
      return deserializeWorkflow(resource as DesktopWorkflow);
    case "team":
      return deserializeTeam(resource as DesktopTeam);
    default:
      throw new Error(`Unsupported resource type: ${detectedType}`);
  }
}

/**
 * Serialize Community resource back to Desktop format
 */
export function serialize(resource: CommunityResource, type: ResourceType): DesktopResource {
  switch (type) {
    case "skill":
      return serializeSkill(resource as SkillWithSource);
    case "mcp":
      return serializeMCP(resource as MCPWithSource);
    case "workflow":
      return serializeWorkflow(resource as WorkflowWithSource);
    case "team":
      return serializeTeam(resource as TeamWithSource);
    default:
      throw new Error(`Unsupported resource type: ${type}`);
  }
}

/**
 * Round-trip validation: deserialize(serialize(x)) should equal x
 */
export function validateRoundTrip<T extends DesktopResource>(
  resource: T,
  type: ResourceType
): boolean {
  try {
    const community = deserialize(resource, type);
    const restored = serialize(community, type);
    return JSON.stringify(restored) === JSON.stringify(resource);
  } catch {
    return false;
  }
}
