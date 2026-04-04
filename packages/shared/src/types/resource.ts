/**
 * Resource type enumeration
 */
export enum ResourceType {
  WORKFLOW = 'workflow',
  TEAM = 'team',
  SKILL = 'skill',
  MCP = 'mcp',
}

// Re-export ReviewStatus from review module for use in this file
import { ReviewStatus } from './review';
export { ReviewStatus };

/**
 * Source app enumeration - identifies which application created the resource
 */
export enum SourceApp {
  COMMUNITY = 'community',
  CLAUDEOPS = 'claudeops',
}

/**
 * Resource content base - all resource types have this structure
 */
export interface ResourceContentBase {
  name: string;
  description?: string | null;
  version: string;
  author?: string;
  tags?: string[] | null;
}

/**
 * Workflow specific content
 */
export interface WorkflowContent extends ResourceContentBase {
  steps: Array<{
    id: string;
    name: string;
    type: string;
    config: Record<string, unknown>;
  }>;
  triggers?: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  variables?: Array<{
    name: string;
    type: string;
    defaultValue?: string;
  }>;
}

/**
 * Team specific content
 */
export interface TeamContent extends ResourceContentBase {
  roles: Array<{
    id: string;
    name: string;
    description: string;
    permissions: string[];
  }>;
}

/**
 * Skill specific content
 */
export interface SkillContent extends ResourceContentBase {
  command: string;
  promptTemplate: string;
  variables?: Array<{
    name: string;
    type: string;
    defaultValue?: string;
  }>;
}

/**
 * MCP server specific content
 */
export interface MCPContent extends ResourceContentBase {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Resource entity
 */
export interface Resource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  content: WorkflowContent | TeamContent | SkillContent | MCPContent;
  authorId: string;
  isPublished: boolean;
  downloads: number;
  likes: number;
  tags?: string[] | null;
  version: string;
  reviewStatus: ReviewStatus;
  sourceApp: SourceApp;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public resource (without sensitive author info)
 */
export interface PublicResource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  content: WorkflowContent | TeamContent | SkillContent | MCPContent;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  isPublished: boolean;
  downloads: number;
  likes: number;
  tags?: string[] | null;
  version: string;
  reviewStatus: ReviewStatus;
  sourceApp: SourceApp;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create resource input
 */
export interface CreateResourceInput {
  name: string;
  description?: string | null;
  type: ResourceType;
  content?: WorkflowContent | TeamContent | SkillContent | MCPContent | null;
  tags?: string[] | null;
  version?: string;
  isPublished?: boolean;
}

/**
 * Update resource input
 */
export interface UpdateResourceInput {
  name?: string;
  description?: string | null;
  content?: WorkflowContent | TeamContent | SkillContent | MCPContent | null;
  tags?: string[] | null;
  version?: string;
  isPublished?: boolean;
}

/**
 * Resource comment
 */
export interface ResourceComment {
  id: string;
  resourceId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

/**
 * Public comment (with user info)
 */
export interface PublicComment {
  id: string;
  resourceId: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  content: string;
  createdAt: Date;
}