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

// Phase 2 - Social features
export {
  resourceRatingSchema,
  createRatingInputSchema,
  updateRatingInputSchema,
  resourceRatingStatsSchema,
} from './rating';
export {
  resourceFavoriteSchema,
  createFavoriteInputSchema,
  toggleFavoriteResponseSchema,
} from './favorite';
export {
  projectSchema,
  projectStatusSchema,
  toolChainItemSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  projectWithRelationsSchema,
} from './project';

// Phase 3 - Forum system
export {
  forumCategorySchema,
  forumPostSchema,
  forumReplySchema,
  forumVoteSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  createReplyInputSchema,
  updateReplyInputSchema,
  createVoteInputSchema,
  forumPostWithRelationsSchema,
  paginatedResponseSchema,
} from './forum';

// Ranking system
export {
  rankingPeriodSchema,
  resourceSortSchema,
  userSortSchema,
  resourceRankingQuerySchema,
  userRankingQuerySchema,
  projectRankingQuerySchema,
  rankedResourceSchema,
  rankedUserSchema,
  rankedProjectSchema,
} from './ranking';

// Notification system
export {
  notificationSchema,
  notificationTypeSchema,
  createNotificationInputSchema,
  updateNotificationInputSchema,
  notificationWithSenderSchema,
  notificationCountsSchema,
  markAllReadResponseSchema,
} from './notification';
