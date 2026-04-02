import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, sql, and, gte, count, avg } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  resources,
  users,
  resourceRatings,
  resourceFavorites,
  resourceComments,
  projects,
  forumReplies,
} from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { getCachedOrCompute, invalidateRankingCaches } from "../lib/redis.js";

const rankingRoutes = new Hono();

// ── Query schemas ───────────────────────────────────────────
const resourceRankingQuery = z.object({
  period: z.enum(["week", "month", "all"]).default("all"),
  sort: z.enum(["rating", "downloads", "favorites"]).default("rating"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const userRankingQuery = z.object({
  period: z.enum(["week", "month", "all"]).default("all"),
  sort: z.enum(["contributions", "reputation"]).default("contributions"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const projectRankingQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Helpers ─────────────────────────────────────────────────
function getPeriodFilter(period: string): string | null {
  const now = new Date();
  if (period === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (period === "month") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null; // "all"
}

// ── GET /api/rankings/resources ─────────────────────────────
rankingRoutes.get("/resources", async (c) => {
  const query = resourceRankingQuery.parse(c.req.query());
  const { period, sort, limit } = query;

  const cacheKey = `ranking:resources:${period}:${sort}:${limit}`;

  const result = await getCachedOrCompute(
    cacheKey,
    async () => {
      const periodDate = getPeriodFilter(period);

      // Composite score:
      // score = avgRating*0.4 + ln(downloads+1)*0.3 + ln(favorites+1)*0.2 + timeDecay*0.1
      // timeDecay = 1 / (1 + daysSinceCreation/30)
      const items = await db.execute(sql`
        SELECT
          r.id,
          r.name,
          r.description,
          r.type,
          r.tags,
          r.downloads,
          r.likes,
          r.created_at as "createdAt",
          COALESCE(rs.avg_rating, 0)::numeric(3,2) as "averageRating",
          COALESCE(rs.rating_count, 0)::int as "ratingCount",
          COALESCE(fs.fav_count, 0)::int as "favoriteCount",
          u.id as "authorId",
          u.username as "authorUsername",
          u.avatar_url as "authorAvatarUrl",
          (
            COALESCE(rs.avg_rating, 0) * 0.4 +
            LN(r.downloads + 1) * 0.3 +
            LN(COALESCE(fs.fav_count, 0) + 1) * 0.2 +
            (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400.0 / 30.0)) * 0.1
          ) as score
        FROM resources r
        LEFT JOIN users u ON r.author_id = u.id
        LEFT JOIN (
          SELECT resource_id, AVG(rating) as avg_rating, COUNT(*) as rating_count
          FROM resource_ratings
          GROUP BY resource_id
        ) rs ON rs.resource_id = r.id
        LEFT JOIN (
          SELECT resource_id, COUNT(*) as fav_count
          FROM resource_favorites
          GROUP BY resource_id
        ) fs ON fs.resource_id = r.id
        WHERE r.is_published = true
        ${periodDate ? sql`AND r.created_at >= ${periodDate}` : sql``}
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      return (items as unknown as Array<Record<string, unknown>>).map(
        (row, idx) => ({
          rank: idx + 1,
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          tags: row.tags,
          downloads: Number(row.downloads),
          likes: Number(row.likes),
          averageRating: Number(row.averageRating),
          ratingCount: Number(row.ratingCount),
          favoriteCount: Number(row.favoriteCount),
          score: Number(Number(row.score).toFixed(4)),
          author: {
            id: row.authorId,
            username: row.authorUsername,
            avatarUrl: row.authorAvatarUrl,
          },
          createdAt: row.createdAt,
        })
      );
    },
    3600
  );

  return c.json({
    success: true,
    data: {
      items: result.data,
      period,
      sort,
      cachedAt: result.cachedAt,
    },
  });
});

// ── GET /api/rankings/users ─────────────────────────────────
rankingRoutes.get("/users", async (c) => {
  const query = userRankingQuery.parse(c.req.query());
  const { period, sort, limit } = query;

  const cacheKey = `ranking:users:${period}:${sort}:${limit}`;

  const result = await getCachedOrCompute(
    cacheKey,
    async () => {
      const periodDate = getPeriodFilter(period);

      // contributions = resourceCount*3 + commentCount + replyCount
      // reputation = avgResourceRating * resourceCount + helpfulVotes(voteScore)
      const items = await db.execute(sql`
        SELECT
          u.id,
          u.username,
          u.avatar_url as "avatarUrl",
          COALESCE(rc.resource_count, 0)::int as "resourceCount",
          COALESCE(cc.comment_count, 0)::int as "commentCount",
          COALESCE(rpc.reply_count, 0)::int as "replyCount",
          COALESCE(rts.avg_rating, 0)::numeric(3,2) as "averageRating",
          CASE
            WHEN ${sort} = 'contributions' THEN
              COALESCE(rc.resource_count, 0) * 3 +
              COALESCE(cc.comment_count, 0) +
              COALESCE(rpc.reply_count, 0)
            ELSE
              COALESCE(rts.avg_rating, 0) * COALESCE(rc.resource_count, 0) +
              COALESCE(rpc.total_vote_score, 0)
          END as score
        FROM users u
        LEFT JOIN (
          SELECT author_id, COUNT(*) as resource_count
          FROM resources
          WHERE is_published = true
          ${periodDate ? sql`AND created_at >= ${periodDate}` : sql``}
          GROUP BY author_id
        ) rc ON rc.author_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as comment_count
          FROM resource_comments
          ${periodDate ? sql`WHERE created_at >= ${periodDate}` : sql``}
          GROUP BY user_id
        ) cc ON cc.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as reply_count, SUM(vote_score) as total_vote_score
          FROM forum_replies
          ${periodDate ? sql`WHERE created_at >= ${periodDate}` : sql``}
          GROUP BY user_id
        ) rpc ON rpc.user_id = u.id
        LEFT JOIN (
          SELECT r2.author_id, AVG(rr.rating) as avg_rating
          FROM resource_ratings rr
          JOIN resources r2 ON rr.resource_id = r2.id
          GROUP BY r2.author_id
        ) rts ON rts.author_id = u.id
        WHERE (
          COALESCE(rc.resource_count, 0) > 0 OR
          COALESCE(cc.comment_count, 0) > 0 OR
          COALESCE(rpc.reply_count, 0) > 0
        )
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      return (items as unknown as Array<Record<string, unknown>>).map(
        (row, idx) => ({
          rank: idx + 1,
          id: row.id,
          username: row.username,
          avatarUrl: row.avatarUrl,
          score: Number(Number(row.score).toFixed(2)),
          resourceCount: Number(row.resourceCount),
          commentCount: Number(row.commentCount),
          averageRating: Number(row.averageRating),
        })
      );
    },
    3600
  );

  return c.json({
    success: true,
    data: {
      items: result.data,
      period,
      sort,
      cachedAt: result.cachedAt,
    },
  });
});

// ── GET /api/rankings/projects ──────────────────────────────
rankingRoutes.get("/projects", async (c) => {
  const query = projectRankingQuery.parse(c.req.query());
  const { limit } = query;

  const cacheKey = `ranking:projects:${limit}`;

  const result = await getCachedOrCompute(
    cacheKey,
    async () => {
      // Score based on linked resource popularity
      const items = await db.execute(sql`
        SELECT
          p.id,
          p.title,
          p.description,
          p.cover_image as "coverImage",
          p.created_at as "createdAt",
          u.id as "authorId",
          u.username as "authorUsername",
          u.avatar_url as "authorAvatarUrl",
          COALESCE(pr_stats.resource_count, 0)::int as "resourceCount",
          COALESCE(pr_stats.total_downloads, 0)::int as "totalDownloads",
          COALESCE(pr_stats.total_likes, 0)::int as "totalLikes",
          (
            COALESCE(pr_stats.total_downloads, 0) * 0.4 +
            COALESCE(pr_stats.total_likes, 0) * 0.4 +
            COALESCE(pr_stats.resource_count, 0) * 0.2
          ) as score
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN (
          SELECT
            pr.project_id,
            COUNT(*) as resource_count,
            SUM(r.downloads) as total_downloads,
            SUM(r.likes) as total_likes
          FROM project_resources pr
          JOIN resources r ON pr.resource_id = r.id
          GROUP BY pr.project_id
        ) pr_stats ON pr_stats.project_id = p.id
        WHERE p.status = 'published'
        ORDER BY score DESC
        LIMIT ${limit}
      `);

      return (items as unknown as Array<Record<string, unknown>>).map(
        (row, idx) => ({
          rank: idx + 1,
          id: row.id,
          title: row.title,
          description: row.description,
          coverImage: row.coverImage,
          score: Number(Number(row.score).toFixed(2)),
          author: {
            id: row.authorId,
            username: row.authorUsername,
            avatarUrl: row.authorAvatarUrl,
          },
          createdAt: row.createdAt,
        })
      );
    },
    3600
  );

  return c.json({
    success: true,
    data: {
      items: result.data,
      cachedAt: result.cachedAt,
    },
  });
});

// ── POST /api/rankings/refresh — admin only ─────────────────
rankingRoutes.post("/refresh", authMiddleware, async (c) => {
  const { role } = c.get("user");
  if (role !== "admin" && role !== "moderator") {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }

  await invalidateRankingCaches();

  return c.json({
    success: true,
    data: { message: "All ranking caches invalidated" },
  });
});

export default rankingRoutes;
