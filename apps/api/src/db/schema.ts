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

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

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
  description: text("description"),
  type: resourceTypeEnum("type").notNull(),
  content: jsonb("content"),
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
// Relations
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  resources: many(resources),
  comments: many(resourceComments),
  likes: many(resourceLikes),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  author: one(users, {
    fields: [resources.authorId],
    references: [users.id],
  }),
  comments: many(resourceComments),
  likes: many(resourceLikes),
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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type ResourceComment = typeof resourceComments.$inferSelect;
export type NewResourceComment = typeof resourceComments.$inferInsert;
export type ResourceLike = typeof resourceLikes.$inferSelect;
export type NewResourceLike = typeof resourceLikes.$inferInsert;
