import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const resourceTypeEnum = pgEnum("resource_type", [
  "workflow",
  "team",
  "skill",
  "mcp",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "moderator"]);

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
export const resources = pgTable("resources", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
export const usersRelations = relations(users, ({ many }) => ({
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
