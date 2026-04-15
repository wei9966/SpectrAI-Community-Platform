import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const resourceTypeEnum = pgEnum("resource_type", [
  "workflow",
  "team",
  "skill",
  "mcp",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "moderator"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
]);

export const promoterLevelEnum = pgEnum("promoter_level", [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);

export const promoterRewardTypeEnum = pgEnum("promoter_reward_type", [
  "credits",
  "membership_days",
]);

export const promoterRewardStatusEnum = pgEnum("promoter_reward_status", [
  "pending",
  "released",
  "expired",
  "cancelled",
]);

// ============================================================
// Users
// ============================================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  avatarUrl: text("avatar_url"),
  githubId: varchar("github_id", { length: 50 }).unique(),
  bio: text("bio"),
  role: userRoleEnum("role").default("user").notNull(),
  displayName: varchar("display_name", { length: 100 }),
  claudeopsUuid: varchar("claudeops_uuid", { length: 36 }).unique(),
  claudeopsPlan: varchar("claudeops_plan", { length: 20 }),
  claudeopsLinkedAt: timestamp("claudeops_linked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Resources
// ============================================================
export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    type: resourceTypeEnum("type").notNull(),
    content: jsonb("content").notNull().default({}),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    downloads: integer("downloads").default(0).notNull(),
    likes: integer("likes").default(0).notNull(),
    tags: text("tags").array(),
    version: varchar("version", { length: 50 }).default("1.0.0").notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    reviewStatus: reviewStatusEnum("review_status").default("draft").notNull(),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    sourceApp: varchar("source_app", { length: 20 }).default("web").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_resources_review_status").on(table.reviewStatus),
    index("idx_resources_source_app").on(table.sourceApp),
  ]
);

// ============================================================
// Resource Publish Log
// ============================================================
export const resourcePublishLog = pgTable(
  "resource_publish_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 50 }).notNull(),
    previousStatus: varchar("previous_status", { length: 50 }),
    newStatus: varchar("new_status", { length: 50 }).notNull(),
    note: text("note"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_resource_publish_log_resource_id").on(table.resourceId),
  ]
);

// ============================================================
// Resource Comments
// ============================================================
export const resourceComments = pgTable("resource_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  resourceId: uuid("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Resource Likes (unique constraint: resource_id + user_id)
// ============================================================
export const resourceLikes = pgTable(
  "resource_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("resource_likes_resource_user_idx").on(
      table.resourceId,
      table.userId
    ),
  ]
);

// ============================================================
// Resource Ratings
// ============================================================
export const resourceRatings = pgTable(
  "resource_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("resource_ratings_resource_user_idx").on(
      table.resourceId,
      table.userId
    ),
  ]
);

// ============================================================
// Resource Favorites
// ============================================================
export const resourceFavorites = pgTable(
  "resource_favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("resource_favorites_resource_user_idx").on(
      table.resourceId,
      table.userId
    ),
  ]
);

// ============================================================
// Projects (Showcase)
// ============================================================
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  coverImage: varchar("cover_image", { length: 500 }),
  demoUrl: varchar("demo_url", { length: 500 }),
  sourceUrl: varchar("source_url", { length: 500 }),
  toolChain: jsonb("tool_chain"),
  tags: text("tags").array(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("published").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Project Resources (junction table)
// ============================================================
export const projectResources = pgTable(
  "project_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("project_resources_project_resource_idx").on(
      table.projectId,
      table.resourceId
    ),
  ]
);

// ============================================================
// Forum Categories
// ============================================================
export const forumCategories = pgTable("forum_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Forum Posts
// ============================================================
export const forumPosts = pgTable("forum_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => forumCategories.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  replyCount: integer("reply_count").default(0).notNull(),
  voteScore: integer("vote_score").default(0).notNull(),
  bestAnswerId: uuid("best_answer_id"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Forum Replies (supports unlimited nesting)
// ============================================================
export const forumReplies = pgTable("forum_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  postId: uuid("post_id")
    .notNull()
    .references(() => forumPosts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  voteScore: integer("vote_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Forum Votes
// ============================================================
export const forumVotes = pgTable(
  "forum_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => forumPosts.id, {
      onDelete: "cascade",
    }),
    replyId: uuid("reply_id").references(() => forumReplies.id, {
      onDelete: "cascade",
    }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("forum_votes_user_post_reply_idx").on(
      table.userId,
      table.postId,
      table.replyId
    ),
  ]
);

// ============================================================
// System Settings (key-value store for admin configuration)
// ============================================================
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull().default(""),
  description: varchar("description", { length: 255 }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Notifications
// ============================================================
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  relatedId: uuid("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  fromUserId: uuid("from_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================================
// Relations
// ============================================================
export const usersRelations = relations(users, ({ one, many }) => ({
  resources: many(resources),
  comments: many(resourceComments),
  likes: many(resourceLikes),
  ratings: many(resourceRatings),
  favorites: many(resourceFavorites),
  projects: many(projects),
  forumPosts: many(forumPosts),
  forumReplies: many(forumReplies),
  forumVotes: many(forumVotes),
  notifications: many(notifications, { relationName: "notificationRecipient" }),
  sentNotifications: many(notifications, { relationName: "notificationSender" }),
  promoterProfile: one(promoterProfiles, {
    fields: [users.id],
    references: [promoterProfiles.userId],
  }),
  promoterRewards: many(promoterRewards, { relationName: "promoterRewardPromoter" }),
  inviteePromoterRewards: many(promoterRewards, { relationName: "promoterRewardInvitee" }),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  author: one(users, {
    fields: [resources.authorId],
    references: [users.id],
  }),
  comments: many(resourceComments),
  likes: many(resourceLikes),
  ratings: many(resourceRatings),
  favorites: many(resourceFavorites),
  projectResources: many(projectResources),
  publishLogs: many(resourcePublishLog),
}));

export const resourceCommentsRelations = relations(
  resourceComments,
  ({ one }) => ({
    resource: one(resources, {
      fields: [resourceComments.resourceId],
      references: [resources.id],
    }),
    user: one(users, {
      fields: [resourceComments.userId],
      references: [users.id],
    }),
  })
);

export const resourceLikesRelations = relations(resourceLikes, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceLikes.resourceId],
    references: [resources.id],
  }),
  user: one(users, {
    fields: [resourceLikes.userId],
    references: [users.id],
  }),
}));

export const resourceRatingsRelations = relations(
  resourceRatings,
  ({ one }) => ({
    resource: one(resources, {
      fields: [resourceRatings.resourceId],
      references: [resources.id],
    }),
    user: one(users, {
      fields: [resourceRatings.userId],
      references: [users.id],
    }),
  })
);

export const resourceFavoritesRelations = relations(
  resourceFavorites,
  ({ one }) => ({
    resource: one(resources, {
      fields: [resourceFavorites.resourceId],
      references: [resources.id],
    }),
    user: one(users, {
      fields: [resourceFavorites.userId],
      references: [users.id],
    }),
  })
);

export const resourcePublishLogRelations = relations(
  resourcePublishLog,
  ({ one }) => ({
    resource: one(resources, {
      fields: [resourcePublishLog.resourceId],
      references: [resources.id],
    }),
    actor: one(users, {
      fields: [resourcePublishLog.actorId],
      references: [users.id],
      relationName: "publishLogActor",
    }),
  })
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  projectResources: many(projectResources),
}));

export const projectResourcesRelations = relations(
  projectResources,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectResources.projectId],
      references: [projects.id],
    }),
    resource: one(resources, {
      fields: [projectResources.resourceId],
      references: [resources.id],
    }),
  })
);

export const forumCategoriesRelations = relations(
  forumCategories,
  ({ many }) => ({
    posts: many(forumPosts),
  })
);

export const forumPostsRelations = relations(
  forumPosts,
  ({ one, many }) => ({
    category: one(forumCategories, {
      fields: [forumPosts.categoryId],
      references: [forumCategories.id],
    }),
    user: one(users, {
      fields: [forumPosts.userId],
      references: [users.id],
    }),
    bestAnswer: one(forumReplies, {
      fields: [forumPosts.bestAnswerId],
      references: [forumReplies.id],
    }),
    replies: many(forumReplies),
    votes: many(forumVotes),
  })
);

export const forumRepliesRelations = relations(
  forumReplies,
  ({ one, many }) => ({
    post: one(forumPosts, {
      fields: [forumReplies.postId],
      references: [forumPosts.id],
    }),
    user: one(users, {
      fields: [forumReplies.userId],
      references: [users.id],
    }),
    parent: one(forumReplies, {
      fields: [forumReplies.parentId],
      references: [forumReplies.id],
      relationName: "replyChildren",
    }),
    children: many(forumReplies, { relationName: "replyChildren" }),
    votes: many(forumVotes),
  })
);

export const forumVotesRelations = relations(forumVotes, ({ one }) => ({
  user: one(users, {
    fields: [forumVotes.userId],
    references: [users.id],
  }),
  post: one(forumPosts, {
    fields: [forumVotes.postId],
    references: [forumPosts.id],
  }),
  reply: one(forumReplies, {
    fields: [forumVotes.replyId],
    references: [forumReplies.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "notificationRecipient",
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
    relationName: "notificationSender",
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type ResourceComment = typeof resourceComments.$inferSelect;
export type NewResourceComment = typeof resourceComments.$inferInsert;
export type ResourceLike = typeof resourceLikes.$inferSelect;
export type NewResourceLike = typeof resourceLikes.$inferInsert;
export type ResourceRating = typeof resourceRatings.$inferSelect;
export type NewResourceRating = typeof resourceRatings.$inferInsert;
export type ResourceFavorite = typeof resourceFavorites.$inferSelect;
export type NewResourceFavorite = typeof resourceFavorites.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectResource = typeof projectResources.$inferSelect;
export type NewProjectResource = typeof projectResources.$inferInsert;
export type ForumCategory = typeof forumCategories.$inferSelect;
export type NewForumCategory = typeof forumCategories.$inferInsert;
export type ForumPost = typeof forumPosts.$inferSelect;
export type NewForumPost = typeof forumPosts.$inferInsert;
export type ForumReply = typeof forumReplies.$inferSelect;
export type NewForumReply = typeof forumReplies.$inferInsert;
export type ForumVote = typeof forumVotes.$inferSelect;
export type NewForumVote = typeof forumVotes.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type ResourcePublishLog = typeof resourcePublishLog.$inferSelect;
export type NewResourcePublishLog = typeof resourcePublishLog.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

// ============================================================
// Credits, Plans, CDK, and Operations
// ============================================================
export const creditAccounts = pgTable("credit_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  balance: integer("balance").default(0).notNull(),
  frozen: integer("frozen").default(0).notNull(),
  lifetimeEarned: integer("lifetime_earned").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    amount: integer("amount").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    refId: uuid("ref_id"),
    refType: varchar("ref_type", { length: 30 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_credit_tx_user").on(table.userId, table.createdAt.desc()),
  ]
);

export const creditRules = pgTable("credit_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action", { length: 50 }).notNull().unique(),
  points: integer("points").notNull(),
  dailyLimit: integer("daily_limit"),
  minTrustLevel: integer("min_trust_level").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tokenQuotas = pgTable("token_quotas", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  balanceUsd: numeric("balance_usd", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  lifetimeUsed: numeric("lifetime_used", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tokenUsageLogs = pgTable(
  "token_usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    model: varchar("model", { length: 50 }).notNull(),
    tokensIn: integer("tokens_in").notNull(),
    tokensOut: integer("tokens_out").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    sessionId: varchar("session_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_token_usage_user").on(table.userId, table.createdAt.desc()),
  ]
);

export const planSubscriptions = pgTable(
  "plan_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: varchar("plan", { length: 20 }).notNull(),
    source: varchar("source", { length: 20 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_plan_sub_user").on(table.userId, table.isActive),
    index("idx_plan_sub_expires")
      .on(table.expiresAt)
      .where(sql`${table.isActive} = true`),
  ]
);

export const mobileAccess = pgTable("mobile_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  source: varchar("source", { length: 20 }).notNull(),
  activationCode: varchar("activation_code", { length: 32 }),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  discountPct: integer("discount_pct").notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  inviterId: uuid("inviter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteeId: uuid("invitee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  rewardStatus: varchar("reward_status", { length: 20 })
    .default("pending")
    .notNull(),
  rewardFrozenUntil: timestamp("reward_frozen_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const promoterProfiles = pgTable(
  "promoter_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    level: promoterLevelEnum("level").default("bronze").notNull(),
    totalInvites: integer("total_invites").default(0).notNull(),
    totalCreditsEarned: integer("total_credits_earned").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_promoter_profiles_level").on(table.level)]
);

export const promoterRewards = pgTable(
  "promoter_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promoterUserId: uuid("promoter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeUserId: uuid("invitee_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteCodeId: uuid("invite_code_id").references(() => inviteCodes.id, {
      onDelete: "set null",
    }),
    rewardType: promoterRewardTypeEnum("reward_type").notNull(),
    amount: integer("amount").notNull(),
    status: promoterRewardStatusEnum("status").default("pending").notNull(),
    releaseAt: timestamp("release_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_promoter_rewards_promoter").on(table.promoterUserId, table.createdAt.desc()),
    index("idx_promoter_rewards_invitee").on(table.inviteeUserId, table.createdAt.desc()),
    index("idx_promoter_rewards_status").on(table.status, table.releaseAt),
  ]
);

export const cdkProjects = pgTable("cdk_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }).notNull(),
  creditPrice: integer("credit_price").notNull(),
  stock: integer("stock").default(0).notNull(),
  distributed: integer("distributed").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const cdkItems = pgTable(
  "cdk_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => cdkProjects.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    codePreview: varchar("code_preview", { length: 8 }),
    status: varchar("status", { length: 20 }).default("available").notNull(),
    redeemedBy: uuid("redeemed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_cdk_items_project").on(table.projectId, table.status)]
);

export const cdkRedemptions = pgTable("cdk_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => cdkItems.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => cdkProjects.id),
  creditCost: integer("credit_cost").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const bounties = pgTable("bounties", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => forumPosts.id, { onDelete: "cascade" }),
  sponsorId: uuid("sponsor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  winnerId: uuid("winner_id").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tips = pgTable("tips", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  platformFee: integer("platform_fee").default(0).notNull(),
  targetType: varchar("target_type", { length: 20 }),
  targetId: uuid("target_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const promotions = pgTable("promotions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: uuid("target_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  cost: integer("cost").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userBadges = pgTable("user_badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  badgeType: varchar("badge_type", { length: 50 }).notNull(),
  badgeValue: varchar("badge_value", { length: 200 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trustLevels = pgTable("trust_levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  level: integer("level").default(0).notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditAccountsRelations = relations(creditAccounts, ({ one }) => ({
  user: one(users, {
    fields: [creditAccounts.userId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
  })
);

export const creditRulesRelations = relations(creditRules, () => ({}));

export const tokenQuotasRelations = relations(tokenQuotas, ({ one }) => ({
  user: one(users, {
    fields: [tokenQuotas.userId],
    references: [users.id],
  }),
}));

export const tokenUsageLogsRelations = relations(tokenUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [tokenUsageLogs.userId],
    references: [users.id],
  }),
}));

export const planSubscriptionsRelations = relations(
  planSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [planSubscriptions.userId],
      references: [users.id],
    }),
  })
);

export const mobileAccessRelations = relations(mobileAccess, ({ one }) => ({
  user: one(users, {
    fields: [mobileAccess.userId],
    references: [users.id],
  }),
}));

export const discountCodesRelations = relations(discountCodes, ({ one }) => ({
  user: one(users, {
    fields: [discountCodes.userId],
    references: [users.id],
  }),
}));

export const inviteCodesRelations = relations(inviteCodes, ({ one, many }) => ({
  inviter: one(users, {
    fields: [inviteCodes.inviterId],
    references: [users.id],
    relationName: "inviteCodeInviter",
  }),
  invitee: one(users, {
    fields: [inviteCodes.inviteeId],
    references: [users.id],
    relationName: "inviteCodeInvitee",
  }),
  promoterRewards: many(promoterRewards),
}));

export const promoterProfilesRelations = relations(promoterProfiles, ({ one }) => ({
  user: one(users, {
    fields: [promoterProfiles.userId],
    references: [users.id],
  }),
}));

export const promoterRewardsRelations = relations(promoterRewards, ({ one }) => ({
  promoterUser: one(users, {
    fields: [promoterRewards.promoterUserId],
    references: [users.id],
    relationName: "promoterRewardPromoter",
  }),
  inviteeUser: one(users, {
    fields: [promoterRewards.inviteeUserId],
    references: [users.id],
    relationName: "promoterRewardInvitee",
  }),
  inviteCode: one(inviteCodes, {
    fields: [promoterRewards.inviteCodeId],
    references: [inviteCodes.id],
  }),
}));

export const cdkProjectsRelations = relations(cdkProjects, ({ one, many }) => ({
  creator: one(users, {
    fields: [cdkProjects.creatorId],
    references: [users.id],
  }),
  items: many(cdkItems),
  redemptions: many(cdkRedemptions),
}));

export const cdkItemsRelations = relations(cdkItems, ({ one, many }) => ({
  project: one(cdkProjects, {
    fields: [cdkItems.projectId],
    references: [cdkProjects.id],
  }),
  redeemer: one(users, {
    fields: [cdkItems.redeemedBy],
    references: [users.id],
    relationName: "cdkItemRedeemer",
  }),
  redemptions: many(cdkRedemptions),
}));

export const cdkRedemptionsRelations = relations(
  cdkRedemptions,
  ({ one }) => ({
    item: one(cdkItems, {
      fields: [cdkRedemptions.itemId],
      references: [cdkItems.id],
    }),
    user: one(users, {
      fields: [cdkRedemptions.userId],
      references: [users.id],
    }),
    project: one(cdkProjects, {
      fields: [cdkRedemptions.projectId],
      references: [cdkProjects.id],
    }),
  })
);

export const bountiesRelations = relations(bounties, ({ one }) => ({
  post: one(forumPosts, {
    fields: [bounties.postId],
    references: [forumPosts.id],
  }),
  sponsor: one(users, {
    fields: [bounties.sponsorId],
    references: [users.id],
    relationName: "bountySponsor",
  }),
  winner: one(users, {
    fields: [bounties.winnerId],
    references: [users.id],
    relationName: "bountyWinner",
  }),
}));

export const tipsRelations = relations(tips, ({ one }) => ({
  fromUser: one(users, {
    fields: [tips.fromUserId],
    references: [users.id],
    relationName: "tipSender",
  }),
  toUser: one(users, {
    fields: [tips.toUserId],
    references: [users.id],
    relationName: "tipRecipient",
  }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  user: one(users, {
    fields: [promotions.userId],
    references: [users.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
}));

export const trustLevelsRelations = relations(trustLevels, ({ one }) => ({
  user: one(users, {
    fields: [trustLevels.userId],
    references: [users.id],
  }),
}));

export type CreditAccount = typeof creditAccounts.$inferSelect;
export type NewCreditAccount = typeof creditAccounts.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type CreditRule = typeof creditRules.$inferSelect;
export type NewCreditRule = typeof creditRules.$inferInsert;
export type TokenQuota = typeof tokenQuotas.$inferSelect;
export type NewTokenQuota = typeof tokenQuotas.$inferInsert;
export type TokenUsageLog = typeof tokenUsageLogs.$inferSelect;
export type NewTokenUsageLog = typeof tokenUsageLogs.$inferInsert;
export type PlanSubscription = typeof planSubscriptions.$inferSelect;
export type NewPlanSubscription = typeof planSubscriptions.$inferInsert;
export type MobileAccess = typeof mobileAccess.$inferSelect;
export type NewMobileAccess = typeof mobileAccess.$inferInsert;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type NewInviteCode = typeof inviteCodes.$inferInsert;
export type PromoterProfile = typeof promoterProfiles.$inferSelect;
export type NewPromoterProfile = typeof promoterProfiles.$inferInsert;
export type PromoterReward = typeof promoterRewards.$inferSelect;
export type NewPromoterReward = typeof promoterRewards.$inferInsert;
export type CdkProject = typeof cdkProjects.$inferSelect;
export type NewCdkProject = typeof cdkProjects.$inferInsert;
export type CdkItem = typeof cdkItems.$inferSelect;
export type NewCdkItem = typeof cdkItems.$inferInsert;
export type CdkRedemption = typeof cdkRedemptions.$inferSelect;
export type NewCdkRedemption = typeof cdkRedemptions.$inferInsert;
export type Bounty = typeof bounties.$inferSelect;
export type NewBounty = typeof bounties.$inferInsert;
export type Tip = typeof tips.$inferSelect;
export type NewTip = typeof tips.$inferInsert;
export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;
export type TrustLevel = typeof trustLevels.$inferSelect;
export type NewTrustLevel = typeof trustLevels.$inferInsert;

