/**
 * Project types for Showcase feature
 */

/**
 * Showcase project entity
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  slug: string;
  coverImageUrl: string | null;
  userId: string;
  isPublished: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project with associated resources
 */
export interface ProjectWithResources extends Project {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  resources: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    likes: number;
    downloads: number;
  }>;
  resourceCount: number;
}

/**
 * Input for creating a project
 */
export interface CreateProjectInput {
  name: string;
  description: string;
  coverImageUrl?: string | null;
  isPublished?: boolean;
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  coverImageUrl?: string | null;
  isPublished?: boolean;
}

/**
 * Project resource association
 */
export interface ProjectResource {
  id: string;
  projectId: string;
  resourceId: string;
  createdAt: Date;
}
