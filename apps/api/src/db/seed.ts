import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;
import * as schema from "./schema.js";
import { eq, sql } from "drizzle-orm";
import type {
  WorkflowContent,
  TeamContent,
  SkillContent,
  MCPContent,
} from "../types/shared.js";
import { seedForum } from "./seed-forum.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

// Helper: generate a Date that is N hours ago from now
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

// Helper: generate a Date that is N days ago from now
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seed() {
  console.log("Seeding database...");

  // ── Create demo users (idempotent) ────────────────────────
  const passwordHash = await hash("demo1234", 12);

  await db
    .insert(schema.users)
    .values([
      {
        username: "alice-dev",
        email: "alice@example.com",
        passwordHash,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
        bio: "Full-stack developer, AI workflow enthusiast",
        role: "admin",
      },
      {
        username: "bob-builder",
        email: "bob@example.com",
        passwordHash,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
        bio: "DevOps engineer, MCP server specialist",
      },
      {
        username: "charlie-ai",
        email: "charlie@example.com",
        passwordHash,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
        bio: "AI researcher exploring multi-agent systems",
      },
    ])
    .onConflictDoNothing();

  // Always query to get user references (works whether just created or already existed)
  const [alice] = await db.select().from(schema.users).where(eq(schema.users.username, "alice-dev"));
  const [bob] = await db.select().from(schema.users).where(eq(schema.users.username, "bob-builder"));
  const [charlie] = await db.select().from(schema.users).where(eq(schema.users.username, "charlie-ai"));

  console.log("Users ready (created or found existing)");

  // ── Create demo resources (idempotent) ─────────────────
  const existingResources = await db.select().from(schema.resources);
  const resourceData = existingResources.length > 0
    ? // Map existing resources by name to preserve consistent index ordering
      ["Code Review Workflow", "Full-Stack Dev Team", "Database Migration Skill",
       "GitHub Integration MCP", "AI Research Assistant Workflow", "QA Review Team",
       "API Documentation Skill", "Postgres Database MCP"].map(
        name => existingResources.find(r => r.name === name) || existingResources[0]
      )
    : await db.insert(schema.resources).values([
      {
        name: "Code Review Workflow",
        description:
          "Automated code review workflow using multiple AI agents. Includes linting, security scanning, and quality analysis steps.",
        type: "workflow" as const,
        content: {
          name: "Code Review Workflow",
          description: "Multi-step automated code review pipeline",
          version: "1.2.0",
          steps: [
            {
              id: "step-lint",
              name: "Lint Check",
              type: "lint",
              config: { agent: "linter", rules: "eslint-recommended" },
            },
            {
              id: "step-security",
              name: "Security Scan",
              type: "security",
              config: { agent: "security-scanner", severity: "high" },
            },
            {
              id: "step-review",
              name: "AI Code Review",
              type: "review",
              config: { agent: "reviewer", depth: "thorough" },
            },
          ],
        } satisfies WorkflowContent,
        authorId: alice.id,
        tags: ["code-review", "automation", "quality"],
        version: "1.2.0",
        isPublished: true,
        downloads: 156,
        likes: 42,
        createdAt: daysAgo(30),
      },
      {
        name: "Full-Stack Dev Team",
        description:
          "Pre-configured multi-agent team for full-stack development. Includes frontend, backend, and DevOps agents.",
        type: "team" as const,
        content: {
          name: "Full-Stack Dev Team",
          description: "Collaborative team for end-to-end web development",
          version: "2.0.0",
          roles: [
            {
              id: "role-frontend",
              name: "Frontend Developer",
              description: "Handles React UI, styling, and client-side logic",
              permissions: ["read", "write", "review"],
            },
            {
              id: "role-backend",
              name: "Backend Developer",
              description: "Handles Node.js API, database, and server logic",
              permissions: ["read", "write", "deploy"],
            },
            {
              id: "role-devops",
              name: "DevOps Engineer",
              description: "Handles CI/CD, Docker, and infrastructure",
              permissions: ["read", "deploy", "configure"],
            },
          ],
        } satisfies TeamContent,
        authorId: alice.id,
        tags: ["team", "fullstack", "development"],
        version: "2.0.0",
        isPublished: true,
        downloads: 89,
        likes: 31,
        createdAt: daysAgo(25),
      },
      {
        name: "Database Migration Skill",
        description:
          "Skill template for safe database migration generation and execution with rollback support.",
        type: "skill" as const,
        content: {
          name: "Database Migration Skill",
          description: "Generate and execute safe database migrations with rollback",
          version: "1.0.0",
          command: "/migrate",
          promptTemplate:
            "Generate a safe database migration for {{database}} based on the schema changes. Include rollback steps. Target: {{target_version}}",
          variables: [
            { name: "database", type: "string", defaultValue: "postgresql" },
            { name: "target_version", type: "string", defaultValue: "latest" },
          ],
        } satisfies SkillContent,
        authorId: bob.id,
        tags: ["database", "migration", "postgres"],
        version: "1.0.0",
        isPublished: true,
        downloads: 67,
        likes: 18,
        createdAt: daysAgo(20),
      },
      {
        name: "GitHub Integration MCP",
        description:
          "MCP server for GitHub API integration. Supports issues, PRs, actions, and repository management.",
        type: "mcp" as const,
        content: {
          name: "GitHub Integration MCP",
          description: "MCP server providing GitHub API tools for issues, PRs, actions, and repos",
          version: "1.5.0",
          command: "npx",
          args: ["@spectrai/mcp-github"],
          env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
        } satisfies MCPContent,
        authorId: bob.id,
        tags: ["github", "integration", "mcp"],
        version: "1.5.0",
        isPublished: true,
        downloads: 234,
        likes: 55,
        createdAt: daysAgo(18),
      },
      {
        name: "AI Research Assistant Workflow",
        description:
          "Multi-step research workflow: gather papers, summarize findings, generate reports with citations.",
        type: "workflow" as const,
        content: {
          name: "AI Research Assistant",
          description: "End-to-end research pipeline from search to report generation",
          version: "1.0.0",
          steps: [
            {
              id: "step-search",
              name: "Paper Search",
              type: "search",
              config: { agent: "researcher", sources: ["arxiv", "scholar"] },
            },
            {
              id: "step-summarize",
              name: "Findings Summary",
              type: "summarize",
              config: { agent: "summarizer", maxLength: 2000 },
            },
            {
              id: "step-report",
              name: "Report Generation",
              type: "report",
              config: { agent: "writer", format: "markdown", citations: true },
            },
          ],
        } satisfies WorkflowContent,
        authorId: charlie.id,
        tags: ["research", "academic", "automation"],
        version: "1.0.0",
        isPublished: true,
        downloads: 45,
        likes: 12,
        createdAt: daysAgo(14),
      },
      {
        name: "QA Review Team",
        description:
          "Quality assurance team with dedicated roles for testing, documentation, and release management.",
        type: "team" as const,
        content: {
          name: "QA Review Team",
          description: "Collaborative QA team for software release quality assurance",
          version: "1.0.0",
          roles: [
            {
              id: "role-tester",
              name: "Test Engineer",
              description: "Writes and runs unit, integration, and e2e tests",
              permissions: ["read", "write", "test"],
            },
            {
              id: "role-docs",
              name: "Documentation Writer",
              description: "Maintains API docs, changelogs, and user guides",
              permissions: ["read", "write"],
            },
            {
              id: "role-release",
              name: "Release Manager",
              description: "Coordinates version bumps, changelogs, and deployments",
              permissions: ["read", "deploy", "configure"],
            },
          ],
        } satisfies TeamContent,
        authorId: charlie.id,
        tags: ["team", "qa", "testing", "release"],
        version: "1.0.0",
        isPublished: true,
        downloads: 38,
        likes: 14,
        createdAt: daysAgo(10),
      },
      {
        name: "API Documentation Skill",
        description:
          "Automatically generate OpenAPI specs and markdown docs from source code annotations.",
        type: "skill" as const,
        content: {
          name: "API Documentation Skill",
          description: "Generate OpenAPI specs and markdown docs from code annotations",
          version: "1.1.0",
          command: "/gen-docs",
          promptTemplate:
            "Analyze the {{language}} source files and generate OpenAPI {{spec_version}} documentation. Output format: {{format}}",
          variables: [
            { name: "language", type: "string", defaultValue: "typescript" },
            { name: "spec_version", type: "string", defaultValue: "3.1" },
            { name: "format", type: "string", defaultValue: "yaml" },
          ],
        } satisfies SkillContent,
        authorId: alice.id,
        tags: ["documentation", "openapi", "automation"],
        version: "1.1.0",
        isPublished: true,
        downloads: 92,
        likes: 27,
        createdAt: daysAgo(7),
      },
      {
        name: "Postgres Database MCP",
        description:
          "MCP server for direct PostgreSQL database operations. Supports queries, migrations, and schema inspection.",
        type: "mcp" as const,
        content: {
          name: "Postgres Database MCP",
          description: "MCP server providing PostgreSQL tools for queries, migrations, and schema inspection",
          version: "1.0.0",
          command: "npx",
          args: ["@spectrai/mcp-postgres"],
          env: { DATABASE_URL: "${DATABASE_URL}" },
        } satisfies MCPContent,
        authorId: charlie.id,
        tags: ["postgres", "database", "mcp", "sql"],
        version: "1.0.0",
        isPublished: true,
        downloads: 113,
        likes: 33,
        createdAt: daysAgo(3),
      },
    ])
    .returning();

  console.log(existingResources.length > 0
    ? `Found ${existingResources.length} existing resources`
    : `Created ${resourceData.length} resources`);

  // ── Create demo comments (skip if already exist) ──────
  // resourceData indices: 0=CodeReview, 1=FullStackTeam, 2=DBMigration,
  // 3=GitHubMCP, 4=AIResearch, 5=QATeam, 6=APIDocs, 7=PostgresMCP
  const existingComments = await db.select({ id: schema.resourceComments.id }).from(schema.resourceComments).limit(1);
  if (existingComments.length === 0) {
    const comments = await db
      .insert(schema.resourceComments)
      .values([
        {
          resourceId: resourceData[0].id,
          userId: bob.id,
          content: "This workflow saved me hours of manual code review! Highly recommended.",
          createdAt: daysAgo(28),
        },
        {
          resourceId: resourceData[0].id,
          userId: charlie.id,
          content: "Great workflow! Would love to see a step for performance analysis too.",
          createdAt: daysAgo(22),
        },
        {
          resourceId: resourceData[3].id,
          userId: alice.id,
          content: "Perfect MCP server for our CI/CD pipeline integration.",
          createdAt: daysAgo(15),
        },
        {
          resourceId: resourceData[5].id,
          userId: alice.id,
          content: "We adopted this QA team setup and our release quality improved dramatically.",
          createdAt: daysAgo(8),
        },
        {
          resourceId: resourceData[6].id,
          userId: bob.id,
          content: "The OpenAPI output is clean and works great with Swagger UI.",
          createdAt: daysAgo(5),
        },
        {
          resourceId: resourceData[7].id,
          userId: bob.id,
          content: "Super useful for quick schema inspections without leaving the editor.",
          createdAt: daysAgo(2),
        },
        {
          resourceId: resourceData[4].id,
          userId: alice.id,
          content: "Used this for my literature review — the citation formatting is spot on.",
          createdAt: hoursAgo(18),
        },
      ])
      .returning();
    console.log(`Created ${comments.length} comments`);
  } else {
    console.log("Comments already exist, skipping");
  }

  // ── Create demo likes ──────────────────────────────────
  const likes = await db
    .insert(schema.resourceLikes)
    .values([
      { resourceId: resourceData[0].id, userId: bob.id, createdAt: daysAgo(27) },
      { resourceId: resourceData[0].id, userId: charlie.id, createdAt: daysAgo(24) },
      { resourceId: resourceData[3].id, userId: alice.id, createdAt: daysAgo(16) },
      { resourceId: resourceData[3].id, userId: charlie.id, createdAt: daysAgo(13) },
      { resourceId: resourceData[5].id, userId: alice.id, createdAt: daysAgo(9) },
      { resourceId: resourceData[5].id, userId: bob.id, createdAt: daysAgo(7) },
      { resourceId: resourceData[6].id, userId: bob.id, createdAt: daysAgo(5) },
      { resourceId: resourceData[6].id, userId: charlie.id, createdAt: daysAgo(4) },
      { resourceId: resourceData[7].id, userId: alice.id, createdAt: daysAgo(2) },
      { resourceId: resourceData[7].id, userId: bob.id, createdAt: hoursAgo(12) },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Created ${likes.length} likes`);

  // ── Create demo ratings (cover all 8 resources) ─────────
  const ratings = await db
    .insert(schema.resourceRatings)
    .values([
      // 0: Code Review Workflow
      { resourceId: resourceData[0].id, userId: bob.id, rating: 5 },
      { resourceId: resourceData[0].id, userId: charlie.id, rating: 4 },
      // 1: Full-Stack Dev Team
      { resourceId: resourceData[1].id, userId: bob.id, rating: 4 },
      { resourceId: resourceData[1].id, userId: charlie.id, rating: 5 },
      // 2: Database Migration Skill
      { resourceId: resourceData[2].id, userId: alice.id, rating: 4 },
      { resourceId: resourceData[2].id, userId: charlie.id, rating: 4 },
      // 3: GitHub Integration MCP
      { resourceId: resourceData[3].id, userId: alice.id, rating: 5 },
      { resourceId: resourceData[3].id, userId: charlie.id, rating: 4 },
      // 4: AI Research Assistant Workflow
      { resourceId: resourceData[4].id, userId: alice.id, rating: 5 },
      { resourceId: resourceData[4].id, userId: bob.id, rating: 4 },
      // 5: QA Review Team
      { resourceId: resourceData[5].id, userId: alice.id, rating: 5 },
      { resourceId: resourceData[5].id, userId: bob.id, rating: 4 },
      // 6: API Documentation Skill
      { resourceId: resourceData[6].id, userId: bob.id, rating: 5 },
      { resourceId: resourceData[6].id, userId: charlie.id, rating: 4 },
      // 7: Postgres Database MCP
      { resourceId: resourceData[7].id, userId: alice.id, rating: 4 },
      { resourceId: resourceData[7].id, userId: bob.id, rating: 5 },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Created ${ratings.length} ratings`);

  // ── Create demo favorites ────────────────────────────────
  const favorites = await db
    .insert(schema.resourceFavorites)
    .values([
      { resourceId: resourceData[0].id, userId: bob.id, createdAt: daysAgo(26) },
      { resourceId: resourceData[0].id, userId: charlie.id, createdAt: daysAgo(21) },
      { resourceId: resourceData[3].id, userId: alice.id, createdAt: daysAgo(14) },
      { resourceId: resourceData[4].id, userId: bob.id, createdAt: daysAgo(6) },
      { resourceId: resourceData[7].id, userId: alice.id, createdAt: daysAgo(1) },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Created ${favorites.length} favorites`);

  // ── Create demo projects (skip if seed projects exist) ───
  const existingProjects = await db.select().from(schema.projects);
  const hasSeedProjects = existingProjects.some(p => p.title === "智能代码审查平台");
  if (!hasSeedProjects) {
    const projects = await db
      .insert(schema.projects)
      .values([
        {
          title: "智能代码审查平台",
          description: "基于 AI Agent 的自动化代码审查与质量保障平台",
          userId: alice.id,
          coverImage: "https://api.dicebear.com/7.x/shapes/svg?seed=project1",
          demoUrl: "https://spectrai.dev/showcase/code-review-demo",
          tags: ["code-review", "ai", "automation"],
          status: "published",
        },
        {
          title: "多 Agent 研究助手",
          description: "利用多个 AI Agent 协作完成学术研究的端到端流程",
          userId: charlie.id,
          coverImage: "https://api.dicebear.com/7.x/shapes/svg?seed=project2",
          demoUrl: "https://spectrai.dev/showcase/research-assistant-demo",
          tags: ["research", "multi-agent"],
          status: "published",
        },
      ])
      .returning();

    console.log(`Created ${projects.length} projects`);

    // ── Link resources to projects ───────────────────────────
    await db
      .insert(schema.projectResources)
      .values([
        { projectId: projects[0].id, resourceId: resourceData[0].id },
        { projectId: projects[0].id, resourceId: resourceData[5].id },
        { projectId: projects[1].id, resourceId: resourceData[4].id },
      ])
      .onConflictDoNothing();

    console.log("Created project-resource links");
  } else {
    console.log("Seed projects already exist, skipping");
  }

  // ── Create demo notifications (skip if already exist) ──
  const existingNotifs = await db.select({ id: schema.notifications.id }).from(schema.notifications).limit(1);
  if (existingNotifs.length === 0) {
    const notifs = await db
      .insert(schema.notifications)
      .values([
        {
          userId: alice.id,
          fromUserId: bob.id,
          type: "rating",
          title: "你的资源「Code Review Workflow」收到了 5 星评分",
          relatedId: resourceData[0].id,
          relatedType: "resource",
          createdAt: daysAgo(20),
        },
        {
          userId: alice.id,
          fromUserId: charlie.id,
          type: "favorite",
          title: "有人收藏了你的资源「Code Review Workflow」",
          relatedId: resourceData[0].id,
          relatedType: "resource",
          createdAt: daysAgo(10),
        },
        {
          userId: bob.id,
          fromUserId: alice.id,
          type: "rating",
          title: "你的资源「GitHub Integration MCP」收到了 5 星评分",
          relatedId: resourceData[3].id,
          relatedType: "resource",
          isRead: true,
          createdAt: daysAgo(3),
        },
      ])
      .returning();

    console.log(`Created ${notifs.length} notifications`);
  } else {
    console.log("Notifications already exist, skipping");
  }

  // ── Forum data ───────────────────────────────────────────
  await seedForum(db, client);

  // ── Cleanup: fix any projects with placeholder demo URLs ──
  const placeholderProjects = await db.execute(
    sql`UPDATE projects SET demo_url = NULL WHERE demo_url LIKE '%example.com%' RETURNING id`
  );
  if ((placeholderProjects as any[]).length > 0) {
    console.log(`Cleaned up ${(placeholderProjects as any[]).length} projects with placeholder demo URLs`);
  }

  // ── Cleanup: invalidate ranking cache after seed data changes ──
  try {
    const { invalidateRankingCaches } = await import("../lib/redis.js");
    await invalidateRankingCaches();
    console.log("Invalidated ranking caches");
  } catch {
    // Redis may not be available during seed
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
