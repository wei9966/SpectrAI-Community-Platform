import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;
import * as schema from "./schema.js";
import type {
  WorkflowContent,
  TeamContent,
  SkillContent,
  MCPContent,
} from "../types/shared.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...");

  // ── Create demo users ───────────────────────────────────
  const passwordHash = await hash("demo1234", 12);

  const [alice, bob, charlie] = await db
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
    .returning();

  console.log(`Created ${3} users`);

  // ── Create demo resources ──────────────────────────────
  const resourceData = await db
    .insert(schema.resources)
    .values([
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
      },
    ])
    .returning();

  console.log(`Created ${resourceData.length} resources`);

  // ── Create demo comments ───────────────────────────────
  // resourceData indices: 0=CodeReview, 1=FullStackTeam, 2=DBMigration,
  // 3=GitHubMCP, 4=AIResearch, 5=QATeam, 6=APIDocs, 7=PostgresMCP
  const comments = await db
    .insert(schema.resourceComments)
    .values([
      {
        resourceId: resourceData[0].id,
        userId: bob.id,
        content: "This workflow saved me hours of manual code review! Highly recommended.",
      },
      {
        resourceId: resourceData[0].id,
        userId: charlie.id,
        content: "Great workflow! Would love to see a step for performance analysis too.",
      },
      {
        resourceId: resourceData[3].id,
        userId: alice.id,
        content: "Perfect MCP server for our CI/CD pipeline integration.",
      },
      {
        resourceId: resourceData[5].id,
        userId: alice.id,
        content: "We adopted this QA team setup and our release quality improved dramatically.",
      },
      {
        resourceId: resourceData[6].id,
        userId: bob.id,
        content: "The OpenAPI output is clean and works great with Swagger UI.",
      },
      {
        resourceId: resourceData[7].id,
        userId: bob.id,
        content: "Super useful for quick schema inspections without leaving the editor.",
      },
      {
        resourceId: resourceData[4].id,
        userId: alice.id,
        content: "Used this for my literature review — the citation formatting is spot on.",
      },
    ])
    .returning();

  console.log(`Created ${comments.length} comments`);

  // ── Create demo likes ──────────────────────────────────
  const likes = await db
    .insert(schema.resourceLikes)
    .values([
      { resourceId: resourceData[0].id, userId: bob.id },
      { resourceId: resourceData[0].id, userId: charlie.id },
      { resourceId: resourceData[3].id, userId: alice.id },
      { resourceId: resourceData[3].id, userId: charlie.id },
      { resourceId: resourceData[5].id, userId: alice.id },
      { resourceId: resourceData[5].id, userId: bob.id },
      { resourceId: resourceData[6].id, userId: bob.id },
      { resourceId: resourceData[6].id, userId: charlie.id },
      { resourceId: resourceData[7].id, userId: alice.id },
      { resourceId: resourceData[7].id, userId: bob.id },
    ])
    .returning();

  console.log(`Created ${likes.length} likes`);

  // ── Create demo ratings ──────────────────────────────────
  const ratings = await db
    .insert(schema.resourceRatings)
    .values([
      { resourceId: resourceData[0].id, userId: bob.id, rating: 5 },
      { resourceId: resourceData[0].id, userId: charlie.id, rating: 4 },
      { resourceId: resourceData[3].id, userId: alice.id, rating: 5 },
      { resourceId: resourceData[3].id, userId: charlie.id, rating: 4 },
      { resourceId: resourceData[5].id, userId: alice.id, rating: 5 },
      { resourceId: resourceData[7].id, userId: alice.id, rating: 4 },
      { resourceId: resourceData[7].id, userId: bob.id, rating: 5 },
    ])
    .returning();

  console.log(`Created ${ratings.length} ratings`);

  // ── Create demo favorites ────────────────────────────────
  const favorites = await db
    .insert(schema.resourceFavorites)
    .values([
      { resourceId: resourceData[0].id, userId: bob.id },
      { resourceId: resourceData[0].id, userId: charlie.id },
      { resourceId: resourceData[3].id, userId: alice.id },
      { resourceId: resourceData[4].id, userId: bob.id },
      { resourceId: resourceData[7].id, userId: alice.id },
    ])
    .returning();

  console.log(`Created ${favorites.length} favorites`);

  // ── Create demo projects ─────────────────────────────────
  const projects = await db
    .insert(schema.projects)
    .values([
      {
        title: "智能代码审查平台",
        description: "基于 AI Agent 的自动化代码审查与质量保障平台",
        userId: alice.id,
        coverImage: "https://api.dicebear.com/7.x/shapes/svg?seed=project1",
        demoUrl: "https://demo.spectrai.dev/code-review",
        tags: ["code-review", "ai", "automation"],
        status: "published",
      },
      {
        title: "多 Agent 研究助手",
        description: "利用多个 AI Agent 协作完成学术研究的端到端流程",
        userId: charlie.id,
        tags: ["research", "multi-agent"],
        status: "published",
      },
    ])
    .returning();

  console.log(`Created ${projects.length} projects`);

  // ── Link resources to projects ───────────────────────────
  const projectLinks = await db
    .insert(schema.projectResources)
    .values([
      { projectId: projects[0].id, resourceId: resourceData[0].id },
      { projectId: projects[0].id, resourceId: resourceData[5].id },
      { projectId: projects[1].id, resourceId: resourceData[4].id },
    ])
    .returning();

  console.log(`Created ${projectLinks.length} project-resource links`);

  // ── Create demo notifications ────────────────────────────
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
      },
      {
        userId: alice.id,
        fromUserId: charlie.id,
        type: "favorite",
        title: "有人收藏了你的资源「Code Review Workflow」",
        relatedId: resourceData[0].id,
        relatedType: "resource",
      },
      {
        userId: bob.id,
        fromUserId: alice.id,
        type: "rating",
        title: "你的资源「GitHub Integration MCP」收到了 5 星评分",
        relatedId: resourceData[3].id,
        relatedType: "resource",
        isRead: true,
      },
    ])
    .returning();

  console.log(`Created ${notifs.length} notifications`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
