import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, and, sql, count, isNull, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  forumCategories,
  forumPosts,
  forumReplies,
  forumVotes,
  users,
} from "../db/schema.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { buildReplyTree } from "../lib/reply-tree.js";
import type { FlatReply } from "../lib/reply-tree.js";
import { createNotification } from "../lib/notify.js";

const forumRoutes = new Hono();

// ── Validation schemas ──────────────────────────────────────
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional().nullable(),
});

const createReplySchema = z.object({
  content: z.string().min(1),
  parentReplyId: z.string().uuid().optional(),
});

const updateReplySchema = z.object({
  content: z.string().min(1),
});

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

const postListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "hot", "unanswered"]).default("newest"),
});

// ════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════

// ── GET /api/forum/categories ───────────────────────────────
forumRoutes.get("/categories", async (c) => {
  const categories = await db
    .select({
      id: forumCategories.id,
      name: forumCategories.name,
      slug: forumCategories.slug,
      description: forumCategories.description,
      icon: forumCategories.icon,
      sortOrder: forumCategories.sortOrder,
      createdAt: forumCategories.createdAt,
      postCount: sql<number>`(SELECT COUNT(*)::int FROM forum_posts WHERE category_id = ${forumCategories.id})`,
      latestPostAt: sql<string | null>`(SELECT MAX(created_at) FROM forum_posts WHERE category_id = ${forumCategories.id})`,
    })
    .from(forumCategories)
    .orderBy(asc(forumCategories.sortOrder));

  return c.json({ success: true, data: categories });
});

// ── GET /api/forum/categories/:slug/posts ───────────────────
forumRoutes.get("/categories/:slug/posts", async (c) => {
  const slug = c.req.param("slug")!;
  const query = postListQuery.parse(c.req.query());
  const { page, limit, sort } = query;
  const offset = (page - 1) * limit;

  // Find category
  const [category] = await db
    .select({ id: forumCategories.id })
    .from(forumCategories)
    .where(eq(forumCategories.slug, slug))
    .limit(1);

  if (!category) {
    return c.json({ success: false, error: "Category not found" }, 404);
  }

  const orderBy =
    sort === "hot"
      ? desc(forumPosts.voteScore)
      : sort === "unanswered"
        ? desc(forumPosts.createdAt)
        : desc(forumPosts.createdAt);

  const unansweredCondition =
    sort === "unanswered"
      ? and(
          eq(forumPosts.categoryId, category.id),
          eq(forumPosts.replyCount, 0)
        )
      : eq(forumPosts.categoryId, category.id);

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        categoryId: forumPosts.categoryId,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        viewCount: forumPosts.viewCount,
        replyCount: forumPosts.replyCount,
        voteScore: forumPosts.voteScore,
        tags: forumPosts.tags,
        createdAt: forumPosts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .where(unansweredCondition)
      .orderBy(desc(forumPosts.isPinned), orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(forumPosts)
      .where(unansweredCondition),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ════════════════════════════════════════════════════════════
// POSTS
// ════════════════════════════════════════════════════════════

// ── POST /api/forum/posts ───────────────────────────────────
forumRoutes.post(
  "/posts",
  authMiddleware,
  zValidator("json", createPostSchema),
  async (c) => {
    const { userId } = c.get("user");
    const body = c.req.valid("json");

    // Verify category exists
    const [cat] = await db
      .select({ id: forumCategories.id })
      .from(forumCategories)
      .where(eq(forumCategories.id, body.categoryId))
      .limit(1);

    if (!cat) {
      return c.json({ success: false, error: "Category not found" }, 404);
    }

    const [post] = await db
      .insert(forumPosts)
      .values({
        title: body.title,
        content: body.content,
        categoryId: body.categoryId,
        userId,
        tags: body.tags,
      })
      .returning();

    return c.json({ success: true, data: post }, 201);
  }
);

// ── GET /api/forum/posts/:id ────────────────────────────────
forumRoutes.get("/posts/:id", optionalAuthMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const currentUserId: string | undefined = c.get("user")?.userId;

  // Fetch post with author
  const [post] = await db
    .select({
      id: forumPosts.id,
      title: forumPosts.title,
      content: forumPosts.content,
      categoryId: forumPosts.categoryId,
      isPinned: forumPosts.isPinned,
      isLocked: forumPosts.isLocked,
      viewCount: forumPosts.viewCount,
      replyCount: forumPosts.replyCount,
      voteScore: forumPosts.voteScore,
      bestAnswerId: forumPosts.bestAnswerId,
      tags: forumPosts.tags,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.userId, users.id))
    .where(eq(forumPosts.id, id))
    .limit(1);

  if (!post) {
    return c.json({ success: false, error: "Post not found" }, 404);
  }

  // Increment view count (fire-and-forget)
  db.update(forumPosts)
    .set({ viewCount: sql`${forumPosts.viewCount} + 1` })
    .where(eq(forumPosts.id, id))
    .then(() => {});

  // Current user's vote on the post
  let currentUserVote: number | null = null;
  if (currentUserId) {
    const [vote] = await db
      .select({ value: forumVotes.value })
      .from(forumVotes)
      .where(
        and(
          eq(forumVotes.userId, currentUserId),
          eq(forumVotes.postId, id),
          isNull(forumVotes.replyId)
        )
      )
      .limit(1);
    currentUserVote = vote?.value ?? null;
  }

  // Fetch all replies flat (single query), then build tree in JS
  const flatReplies = await db
    .select({
      id: forumReplies.id,
      content: forumReplies.content,
      postId: forumReplies.postId,
      userId: forumReplies.userId,
      parentId: forumReplies.parentId,
      voteScore: forumReplies.voteScore,
      createdAt: forumReplies.createdAt,
      updatedAt: forumReplies.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(forumReplies)
    .leftJoin(users, eq(forumReplies.userId, users.id))
    .where(eq(forumReplies.postId, id))
    .orderBy(asc(forumReplies.createdAt));

  // If logged in, fetch user's votes on all replies in this post
  let replyVoteMap: Record<string, number> = {};
  if (currentUserId) {
    const replyVotes = await db
      .select({
        replyId: forumVotes.replyId,
        value: forumVotes.value,
      })
      .from(forumVotes)
      .where(
        and(
          eq(forumVotes.userId, currentUserId),
          isNull(forumVotes.postId)
        )
      );
    for (const v of replyVotes) {
      if (v.replyId) replyVoteMap[v.replyId] = v.value;
    }
  }

  // Build reply tree
  const repliesWithVotes: FlatReply[] = flatReplies.map((r) => ({
    ...r,
    currentUserVote: replyVoteMap[r.id] ?? null,
  }));
  const replyTree = buildReplyTree(repliesWithVotes);

  return c.json({
    success: true,
    data: {
      ...post,
      currentUserVote,
      replies: replyTree,
    },
  });
});

// ── PUT /api/forum/posts/:id ────────────────────────────────
forumRoutes.put(
  "/posts/:id",
  authMiddleware,
  zValidator("json", updatePostSchema),
  async (c) => {
    const id = c.req.param("id")!;
    const { userId } = c.get("user");
    const body = c.req.valid("json");

    const [existing] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }
    if (existing.userId !== userId) {
      return c.json({ success: false, error: "Not authorized" }, 403);
    }
    if (existing.isLocked) {
      return c.json({ success: false, error: "Post is locked" }, 403);
    }

    const [updated] = await db
      .update(forumPosts)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(forumPosts.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  }
);

// ── DELETE /api/forum/posts/:id ─────────────────────────────
forumRoutes.delete("/posts/:id", authMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const { userId, role } = c.get("user");

  const [existing] = await db
    .select()
    .from(forumPosts)
    .where(eq(forumPosts.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: "Post not found" }, 404);
  }
  if (existing.userId !== userId && role !== "admin" && role !== "moderator") {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await db.delete(forumPosts).where(eq(forumPosts.id, id));
  return c.json({ success: true, data: { message: "Post deleted" } });
});

// ════════════════════════════════════════════════════════════
// REPLIES
// ════════════════════════════════════════════════════════════

// ── POST /api/forum/posts/:id/replies ───────────────────────
forumRoutes.post(
  "/posts/:id/replies",
  authMiddleware,
  zValidator("json", createReplySchema),
  async (c) => {
    const postId = c.req.param("id")!;
    const { userId } = c.get("user");
    const { content, parentReplyId } = c.req.valid("json");

    // Check post exists and not locked (include userId for notification)
    const [post] = await db
      .select({ id: forumPosts.id, isLocked: forumPosts.isLocked, userId: forumPosts.userId, title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }
    if (post.isLocked) {
      return c.json({ success: false, error: "Post is locked" }, 403);
    }

    // If parentReplyId provided, verify it exists and belongs to same post
    if (parentReplyId) {
      const [parentReply] = await db
        .select({ id: forumReplies.id, postId: forumReplies.postId })
        .from(forumReplies)
        .where(eq(forumReplies.id, parentReplyId))
        .limit(1);

      if (!parentReply || parentReply.postId !== postId) {
        return c.json(
          { success: false, error: "Parent reply not found in this post" },
          404
        );
      }
    }

    const [reply] = await db
      .insert(forumReplies)
      .values({
        content,
        postId,
        userId,
        parentId: parentReplyId || null,
      })
      .returning();

    // Increment reply count
    await db
      .update(forumPosts)
      .set({ replyCount: sql`${forumPosts.replyCount} + 1` })
      .where(eq(forumPosts.id, postId));

    // Notify post author about new reply
    createNotification({
      type: "forum_reply",
      fromUserId: userId,
      toUserId: post.userId,
      title: `你的帖子「${post.title}」收到了新回复`,
      relatedId: postId,
      relatedType: "forum_post",
    });

    // If replying to another reply, also notify that reply's author
    if (parentReplyId) {
      const [parentReply] = await db
        .select({ userId: forumReplies.userId })
        .from(forumReplies)
        .where(eq(forumReplies.id, parentReplyId))
        .limit(1);
      if (parentReply) {
        createNotification({
          type: "forum_reply",
          fromUserId: userId,
          toUserId: parentReply.userId,
          title: `有人回复了你在「${post.title}」中的评论`,
          relatedId: postId,
          relatedType: "forum_post",
        });
      }
    }

    return c.json({ success: true, data: reply }, 201);
  }
);

// ── PUT /api/forum/replies/:id ──────────────────────────────
forumRoutes.put(
  "/replies/:id",
  authMiddleware,
  zValidator("json", updateReplySchema),
  async (c) => {
    const id = c.req.param("id")!;
    const { userId } = c.get("user");
    const { content } = c.req.valid("json");

    const [existing] = await db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Reply not found" }, 404);
    }
    if (existing.userId !== userId) {
      return c.json({ success: false, error: "Not authorized" }, 403);
    }

    const [updated] = await db
      .update(forumReplies)
      .set({ content, updatedAt: new Date() })
      .where(eq(forumReplies.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  }
);

// ── DELETE /api/forum/replies/:id ───────────────────────────
forumRoutes.delete("/replies/:id", authMiddleware, async (c) => {
  const id = c.req.param("id")!;
  const { userId, role } = c.get("user");

  const [existing] = await db
    .select()
    .from(forumReplies)
    .where(eq(forumReplies.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: "Reply not found" }, 404);
  }
  if (existing.userId !== userId && role !== "admin" && role !== "moderator") {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await db.delete(forumReplies).where(eq(forumReplies.id, id));

  // Decrement reply count
  await db
    .update(forumPosts)
    .set({
      replyCount: sql`GREATEST(${forumPosts.replyCount} - 1, 0)`,
    })
    .where(eq(forumPosts.id, existing.postId));

  return c.json({ success: true, data: { message: "Reply deleted" } });
});

// ════════════════════════════════════════════════════════════
// VOTES (transaction-based toggle)
// ════════════════════════════════════════════════════════════

// ── POST /api/forum/posts/:id/vote ──────────────────────────
forumRoutes.post(
  "/posts/:id/vote",
  authMiddleware,
  zValidator("json", voteSchema),
  async (c) => {
    const postId = c.req.param("id")!;
    const { userId } = c.get("user");
    const { value } = c.req.valid("json");

    // Verify post exists (include userId + title for notification)
    const [postForVote] = await db
      .select({ id: forumPosts.id, userId: forumPosts.userId, title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postForVote) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }

    const result = await db.transaction(async (tx) => {
      // Check existing vote
      const [existing] = await tx
        .select()
        .from(forumVotes)
        .where(
          and(
            eq(forumVotes.userId, userId),
            eq(forumVotes.postId, postId),
            isNull(forumVotes.replyId)
          )
        )
        .limit(1);

      if (existing) {
        if (existing.value === value) {
          // Same vote → toggle off (remove)
          await tx
            .delete(forumVotes)
            .where(eq(forumVotes.id, existing.id));
          await tx
            .update(forumPosts)
            .set({
              voteScore: sql`${forumPosts.voteScore} - ${existing.value}`,
            })
            .where(eq(forumPosts.id, postId));
          return { voteScore: null, action: "removed" };
        } else {
          // Different vote → update
          await tx
            .update(forumVotes)
            .set({ value })
            .where(eq(forumVotes.id, existing.id));
          // Diff = new - old (e.g., 1 - (-1) = +2)
          const diff = value - existing.value;
          await tx
            .update(forumPosts)
            .set({
              voteScore: sql`${forumPosts.voteScore} + ${diff}`,
            })
            .where(eq(forumPosts.id, postId));
          return { voteScore: value, action: "changed" };
        }
      } else {
        // No existing vote → insert
        await tx
          .insert(forumVotes)
          .values({ userId, postId, value });
        await tx
          .update(forumPosts)
          .set({
            voteScore: sql`${forumPosts.voteScore} + ${value}`,
          })
          .where(eq(forumPosts.id, postId));
        return { voteScore: value, action: "voted" };
      }
    });

    // Notify post author on new/changed vote (not on removal)
    if (result.action !== "removed") {
      const voteLabel = value === 1 ? "赞同" : "反对";
      createNotification({
        type: "forum_vote",
        fromUserId: userId,
        toUserId: postForVote.userId,
        title: `有人${voteLabel}了你的帖子「${postForVote.title}」`,
        relatedId: postId,
        relatedType: "forum_post",
      });
    }

    return c.json({ success: true, data: result });
  }
);

// ── POST /api/forum/replies/:id/vote ────────────────────────
forumRoutes.post(
  "/replies/:id/vote",
  authMiddleware,
  zValidator("json", voteSchema),
  async (c) => {
    const replyId = c.req.param("id")!;
    const { userId } = c.get("user");
    const { value } = c.req.valid("json");

    // Verify reply exists (include userId + postId for notification)
    const [replyForVote] = await db
      .select({ id: forumReplies.id, userId: forumReplies.userId, postId: forumReplies.postId })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId))
      .limit(1);

    if (!replyForVote) {
      return c.json({ success: false, error: "Reply not found" }, 404);
    }

    const result = await db.transaction(async (tx) => {
      // Check existing vote
      const [existing] = await tx
        .select()
        .from(forumVotes)
        .where(
          and(
            eq(forumVotes.userId, userId),
            eq(forumVotes.replyId, replyId),
            isNull(forumVotes.postId)
          )
        )
        .limit(1);

      if (existing) {
        if (existing.value === value) {
          // Same vote → toggle off
          await tx
            .delete(forumVotes)
            .where(eq(forumVotes.id, existing.id));
          await tx
            .update(forumReplies)
            .set({
              voteScore: sql`${forumReplies.voteScore} - ${existing.value}`,
            })
            .where(eq(forumReplies.id, replyId));
          return { voteScore: null, action: "removed" };
        } else {
          // Different vote → update
          await tx
            .update(forumVotes)
            .set({ value })
            .where(eq(forumVotes.id, existing.id));
          const diff = value - existing.value;
          await tx
            .update(forumReplies)
            .set({
              voteScore: sql`${forumReplies.voteScore} + ${diff}`,
            })
            .where(eq(forumReplies.id, replyId));
          return { voteScore: value, action: "changed" };
        }
      } else {
        // No existing vote → insert
        await tx
          .insert(forumVotes)
          .values({ userId, replyId, value });
        await tx
          .update(forumReplies)
          .set({
            voteScore: sql`${forumReplies.voteScore} + ${value}`,
          })
          .where(eq(forumReplies.id, replyId));
        return { voteScore: value, action: "voted" };
      }
    });

    // Notify reply author on new/changed vote (not on removal)
    if (result.action !== "removed") {
      const voteLabel = value === 1 ? "赞同" : "反对";
      createNotification({
        type: "forum_vote",
        fromUserId: userId,
        toUserId: replyForVote.userId,
        title: `有人${voteLabel}了你的回复`,
        relatedId: replyForVote.postId,
        relatedType: "forum_post",
      });
    }

    return c.json({ success: true, data: result });
  }
);

export default forumRoutes;
