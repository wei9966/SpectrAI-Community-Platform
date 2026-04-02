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
  reviewStatusSchema,
  sourceAppSchema,
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

// Publish schemas
export {
  publishRequestSchema,
  publishResponseSchema,
  desktopResourceSchema,
} from './publish.schema';
export type { PublishRequest, PublishResponse, DesktopResource } from './publish.schema';

// Review schemas
export {
  reviewStatusSchema,
  reviewActionSchema,
  reviewerRoleSchema,
  resourcePublishLogSchema,
  reviewDetailSchema,
  pendingReviewItemSchema,
  reviewQueueResponseSchema,
  reviewQueueParamsSchema,
  approveReviewSchema,
  rejectReviewSchema,
} from './review.schema';
