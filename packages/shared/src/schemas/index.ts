// Resource schemas (export only zod schemas, not types that conflict with types/)
export {
  workflowContentSchema,
} from './workflow.schema';
export {
  skillContentSchema,
} from './skill.schema';
export {
  teamContentSchema,
} from './team.schema';
export {
  mcpContentSchema,
} from './mcp.schema';
export {
  resourceTypeSchema,
  createResourceInputSchema,
  updateResourceInputSchema,
  authorSchema,
  publicResourceSchema,
} from './resource.schema';

// Rating schemas
export {
  createRatingSchema,
} from './rating.schema';

// Favorite schemas
export {
  toggleFavoriteSchema,
} from './favorite.schema';

// Project schemas
export {
  createProjectSchema,
  updateProjectSchema,
  addProjectResourceSchema,
} from './project.schema';

// Forum schemas
export {
  createPostSchema,
  updatePostSchema,
  createReplySchema,
  voteSchema,
} from './forum.schema';

// Notification schemas
export {
  getNotificationsSchema,
  markNotificationReadSchema,
  markAllNotificationsReadSchema,
} from './notification.schema';
