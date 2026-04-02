import type { ResourceType, SkillContent, MCPContent, WorkflowContent, TeamContent } from './resource';

/**
 * Dependency item within an install manifest.
 * Represents a referenced Skill/MCP/Workflow/Team that should be installed alongside the primary resource.
 */
export interface InstallDependency {
  type: ResourceType;
  id: string;
  name: string;
  version: string;
  installUrl: string;
}

/**
 * Author info included in the install manifest.
 */
export interface InstallManifestAuthor {
  username: string;
  avatarUrl: string | null;
}

/**
 * Standardized install manifest returned by GET /api/resources/:id/install-manifest.
 * Contains everything a desktop client needs to install a resource via deep link.
 */
export interface InstallManifest {
  id: string;
  type: ResourceType;
  name: string;
  version: string;
  content: SkillContent | MCPContent | WorkflowContent | TeamContent;
  author: InstallManifestAuthor;
  dependencies: InstallDependency[];
  installUrl: string;
  createdAt: string;
  checksum: string;
}
