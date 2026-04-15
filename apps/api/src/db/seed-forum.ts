/**
 * Forum seed data — run with: npx tsx apps/api/src/db/seed-forum.ts
 *
 * Idempotent: detects existing seed posts and re-creates them with proper
 * user distribution. Relies on ON DELETE CASCADE to clean up replies/votes.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Database } from "./index.js";
import * as schema from "./schema.js";
import { forumCategories, forumPosts, forumReplies, forumVotes, users } from "./schema.js";
import type { ForumCategory, ForumPost } from "./schema.js";
import { eq, sql, inArray } from "drizzle-orm";

// Known seed post titles — used for idempotency detection
const SEED_POST_TITLES = [
  "如何构建多 Agent 协作工作流？",
  "MCP Server 开发最佳实践",
  "Prompt Engineering 技巧分享",
  "推荐：高效的代码审查工作流",
  "数据分析 Team 配置分享",
  "资源导入时 JSON 解析错误",
  "搜索功能在特定条件下返回空结果",
  "希望增加资源版本管理功能",
  "建议支持资源组合/套件功能",
  "SpectrAI 社区平台 v0.2 发布公告",
];

// Helper: generate a Date that is N hours ago from now
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

type SeedDb = Database;
type SeedClient = ReturnType<typeof postgres>;
type SeedCategoryRow = Pick<ForumCategory, "id" | "slug">;
type SeedPostRow = Pick<ForumPost, "id" | "userId">;

export async function seedForum(dbArg?: SeedDb, clientArg?: SeedClient) {
  // If db and client are not provided, create our own connection
  const ownConnection = !dbArg;
  let ownClient: SeedClient | undefined;
  let client: SeedClient | undefined = clientArg;
  let db: SeedDb;

  if (dbArg) {
    db = dbArg;
  } else {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error("DATABASE_URL is required");
      process.exit(1);
    }
    ownClient = postgres(databaseUrl);
    db = drizzle(ownClient, { schema });
    client = ownClient;
  }

  console.log("Seeding forum data...");

  // Get all users to distribute posts across them
  const allUsers = await db
    .select({ id: users.id })
    .from(users);

  if (allUsers.length === 0) {
    console.log("No users found, creating seed user...");
    const [admin] = await db
      .insert(users)
      .values({
        username: "admin",
        email: "admin@spectrai.dev",
        passwordHash: "$2b$10$placeholder",
        role: "admin",
      })
      .returning({ id: users.id });
    allUsers.push(admin);
  }

  // Helper to cycle through users for realistic distribution
  const getUserId = (index: number) => allUsers[index % allUsers.length].id;

  // ── Categories ────────────────────────────────────────────
  const categoryData = [
    {
      name: "技术讨论",
      slug: "tech-discussion",
      description: "分享和讨论 AI Agent、工作流和技术方案",
      icon: "💻",
      sortOrder: 1,
    },
    {
      name: "资源分享",
      slug: "resource-sharing",
      description: "分享优质的工作流、Team、Skill 和 MCP 资源",
      icon: "📦",
      sortOrder: 2,
    },
    {
      name: "Bug 报告",
      slug: "bug-reports",
      description: "报告平台 Bug 和资源使用问题",
      icon: "🐛",
      sortOrder: 3,
    },
    {
      name: "功能建议",
      slug: "feature-requests",
      description: "提出新功能建议和改进想法",
      icon: "💡",
      sortOrder: 4,
    },
    {
      name: "公告",
      slug: "announcements",
      description: "平台公告和重要通知",
      icon: "📢",
      sortOrder: 0,
    },
  ];

  const insertedCategories = await db
    .insert(forumCategories)
    .values(categoryData)
    .onConflictDoNothing({ target: forumCategories.slug })
    .returning();

  const cats =
    insertedCategories.length > 0
      ? insertedCategories
      : await db.select().from(forumCategories);

  const catMap = Object.fromEntries(cats.map((c: SeedCategoryRow) => [c.slug, c.id]));

  // ── Idempotency: clean up existing seed posts ──────────────
  const existingSeedPosts = await db
    .select({ id: forumPosts.id, userId: forumPosts.userId })
    .from(forumPosts)
    .where(inArray(forumPosts.title, SEED_POST_TITLES));

  if (existingSeedPosts.length > 0) {
    const uniqueAuthors = new Set(existingSeedPosts.map((p: SeedPostRow) => p.userId));
    if (uniqueAuthors.size >= Math.min(allUsers.length, 2)) {
      console.log(
        `Found ${existingSeedPosts.length} seed posts with ${uniqueAuthors.size} distinct authors — skipping (already seeded correctly)`
      );
      if (client) {
        await client.end();
      }
      return;
    }
    // Existing posts have wrong user distribution — delete and re-create
    // ON DELETE CASCADE on replies & votes handles cleanup
    console.log(
      `Found ${existingSeedPosts.length} seed posts but only ${uniqueAuthors.size} author(s) — re-seeding with proper distribution`
    );
    await db
      .delete(forumPosts)
      .where(inArray(forumPosts.id, existingSeedPosts.map((p: SeedPostRow) => p.id)));
  }

  // ── Posts (distributed across users with staggered timestamps) ──
  const postsData = [
    // 技术讨论
    {
      title: "如何构建多 Agent 协作工作流？",
      content:
        "最近在研究多 Agent 协作模式，想了解大家都是怎么设计 Agent 之间的通信和任务分配的？\n\n目前我的方案是用一个 Leader Agent 做任务拆解，然后分配给不同的 Worker Agent。但遇到了一些并发和状态同步的问题。\n\n有没有更好的架构模式推荐？",
      categoryId: catMap["tech-discussion"],
      userId: getUserId(0),
      tags: ["multi-agent", "workflow", "architecture"],
      createdAt: hoursAgo(168),
    },
    {
      title: "MCP Server 开发最佳实践",
      content:
        "整理了一些 MCP Server 开发的经验：\n\n1. **工具命名**：使用 snake_case，保持简洁\n2. **错误处理**：返回结构化错误信息\n3. **超时控制**：长时间操作设置合理的 timeout\n4. **资源管理**：及时清理临时文件和连接\n\n欢迎补充！",
      categoryId: catMap["tech-discussion"],
      userId: getUserId(1),
      tags: ["mcp", "best-practices"],
      createdAt: hoursAgo(144),
    },
    {
      title: "Prompt Engineering 技巧分享",
      content:
        "分享几个提升 AI 工具效果的提示词技巧：\n\n- 使用角色定义明确任务边界\n- 提供具体的输出格式示例\n- 使用 chain-of-thought 引导推理\n- 设定约束条件避免模型偏离",
      categoryId: catMap["tech-discussion"],
      userId: getUserId(2),
      tags: ["prompt-engineering", "tips"],
      createdAt: hoursAgo(120),
    },
    // 资源分享
    {
      title: "推荐：高效的代码审查工作流",
      content:
        "分享一个我常用的代码审查工作流配置，支持多语言、多框架的自动化审查。\n\n主要特性：\n- 静态分析 + AI 辅助审查\n- 安全漏洞检测\n- 性能问题识别\n\n资源链接在评论区。",
      categoryId: catMap["resource-sharing"],
      userId: getUserId(0),
      tags: ["code-review", "workflow"],
      createdAt: hoursAgo(96),
    },
    {
      title: "数据分析 Team 配置分享",
      content:
        "配置了一个数据分析团队，包含：\n- 数据采集 Agent\n- 数据清洗 Agent\n- 分析 Agent\n- 可视化 Agent\n\n效果很好，处理速度提升了3倍。",
      categoryId: catMap["resource-sharing"],
      userId: getUserId(1),
      tags: ["data-analysis", "team"],
      createdAt: hoursAgo(72),
    },
    // Bug 报告
    {
      title: "资源导入时 JSON 解析错误",
      content:
        "在导入含有特殊字符的工作流 JSON 时，系统报错：\n\n```\nSyntaxError: Unexpected token '\\' in JSON at position 234\n```\n\n复现步骤：\n1. 创建包含中文注释的工作流\n2. 导出 JSON\n3. 重新导入\n\n环境：Chrome 120, Windows 11",
      categoryId: catMap["bug-reports"],
      userId: getUserId(2),
      tags: ["bug", "json", "import"],
      createdAt: hoursAgo(60),
    },
    {
      title: "搜索功能在特定条件下返回空结果",
      content:
        "当搜索关键词包含连字符（如 `code-review`）时，搜索返回空结果，但实际存在匹配的资源。\n\n预期行为：应该能搜索到包含连字符的资源名称。",
      categoryId: catMap["bug-reports"],
      userId: getUserId(1),
      tags: ["bug", "search"],
      createdAt: hoursAgo(48),
    },
    // 功能建议
    {
      title: "希望增加资源版本管理功能",
      content:
        "目前资源只有一个版本字段，无法管理历史版本。建议增加：\n\n1. 版本历史记录\n2. 版本回滚\n3. 版本对比\n4. 语义化版本号验证\n\n这样可以更好地管理资源的迭代。",
      categoryId: catMap["feature-requests"],
      userId: getUserId(0),
      tags: ["feature", "versioning"],
      createdAt: hoursAgo(36),
    },
    {
      title: "建议支持资源组合/套件功能",
      content:
        "很多时候一个完整的解决方案需要组合多个资源（Workflow + Team + MCP），建议支持：\n\n- 创建资源套件\n- 一键安装整个套件\n- 套件级别的评分和评论",
      categoryId: catMap["feature-requests"],
      userId: getUserId(2),
      tags: ["feature", "bundle"],
      createdAt: hoursAgo(24),
    },
    // 公告
    {
      title: "SpectrAI 社区平台 v0.2 发布公告",
      content:
        "SpectrAI 社区平台 v0.2 版本正式发布！\n\n## 新功能\n- 资源评分系统\n- 收藏功能\n- Showcase 项目展示\n- 排行榜\n- 论坛系统\n\n感谢社区的支持和反馈！",
      categoryId: catMap["announcements"],
      userId: getUserId(0),
      isPinned: true,
      tags: ["announcement", "release"],
      createdAt: hoursAgo(12),
    },
  ];

  const insertedPosts = await db
    .insert(forumPosts)
    .values(postsData)
    .returning();

  // ── Replies (distributed across users with staggered timestamps) ──
  const repliesData = [
    // Replies for first post (multi-agent) — different users reply
    {
      content:
        "我推荐看看 CrewAI 的设计模式，它的任务分配和状态管理做得不错。关键是要定义好每个 Agent 的工具和职责边界。",
      postId: insertedPosts[0].id,
      userId: getUserId(1),
      createdAt: hoursAgo(160),
    },
    {
      content:
        "我用过事件驱动的方式来处理 Agent 间通信，比直接调用更灵活。可以参考 pub/sub 模式。",
      postId: insertedPosts[0].id,
      userId: getUserId(2),
      createdAt: hoursAgo(150),
    },
    // Replies for MCP post
    {
      content:
        "补充一点：MCP Server 最好支持 graceful shutdown，特别是处理长时间运行的工具时。",
      postId: insertedPosts[1].id,
      userId: getUserId(0),
      createdAt: hoursAgo(132),
    },
    // Replies for code review post
    {
      content: "这个工作流配置很实用！请问支持 TypeScript 的类型检查吗？",
      postId: insertedPosts[3].id,
      userId: getUserId(1),
      createdAt: hoursAgo(84),
    },
    {
      content: "已经在用了，确实能提升代码质量。建议加上 ESLint 规则检查。",
      postId: insertedPosts[3].id,
      userId: getUserId(2),
      createdAt: hoursAgo(78),
    },
    // Reply for bug report
    {
      content:
        "确认了这个问题，原因是 JSON.parse 没有正确处理 Unicode 转义序列。已提交修复 PR。",
      postId: insertedPosts[5].id,
      userId: getUserId(0),
      createdAt: hoursAgo(54),
    },
    // Reply for feature request
    {
      content:
        "非常支持版本管理功能！另外建议加上变更日志自动生成。",
      postId: insertedPosts[7].id,
      userId: getUserId(1),
      createdAt: hoursAgo(30),
    },
  ];

  await db.insert(forumReplies).values(repliesData);

  // Update reply counts
  for (const post of insertedPosts) {
    const replies = repliesData.filter((r) => r.postId === post.id);
    if (replies.length > 0) {
      await db
        .update(forumPosts)
        .set({ replyCount: replies.length })
        .where(eq(forumPosts.id, post.id));
    }
  }

  // ── Votes ────────────────────────────────────────────────
  // Get inserted replies to reference their IDs
  const insertedReplies = await db
    .select({ id: forumReplies.id, postId: forumReplies.postId })
    .from(forumReplies);

  const votesData = [
    // Upvotes on posts — different users vote
    { userId: getUserId(1), postId: insertedPosts[0].id, value: 1 },
    { userId: getUserId(2), postId: insertedPosts[1].id, value: 1 },
    { userId: getUserId(1), postId: insertedPosts[9].id, value: 1 },
  ];

  if (insertedReplies.length > 0) {
    votesData.push(
      { userId: getUserId(2), replyId: insertedReplies[0].id, value: 1 } as any,
    );
  }

  await db.insert(forumVotes).values(votesData);

  // Update vote scores on posts
  for (const vote of votesData.filter((v) => v.postId)) {
    await db
      .update(forumPosts)
      .set({ voteScore: sql`${forumPosts.voteScore} + ${vote.value}` })
      .where(eq(forumPosts.id, vote.postId!));
  }

  console.log(`Seeded ${cats.length} categories, ${insertedPosts.length} posts, ${repliesData.length} replies, ${votesData.length} votes`);
  console.log("Forum seed complete!");

  // Only close connection if we created our own
  if (ownConnection && client) {
    await client.end();
  }
}

// Only auto-run when executed directly (not when imported by seed.ts)
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedForum().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
