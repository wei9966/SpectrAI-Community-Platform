import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "bcryptjs";
import * as schema from "./schema.js";

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
          steps: [
            { name: "lint", agent: "linter", prompt: "Check code style" },
            {
              name: "security",
              agent: "security-scanner",
              prompt: "Scan for vulnerabilities",
            },
            {
              name: "review",
              agent: "reviewer",
              prompt: "Provide code review feedback",
            },
          ],
        },
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
          agents: [
            { role: "frontend", model: "claude-sonnet", skills: ["react", "css"] },
            { role: "backend", model: "claude-opus", skills: ["node", "postgres"] },
            { role: "devops", model: "claude-haiku", skills: ["docker", "ci-cd"] },
          ],
        },
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
          trigger: "/migrate",
          prompt:
            "Generate a safe database migration based on the schema changes. Include rollback steps.",
          tools: ["sql-executor", "schema-diff"],
        },
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
          server: {
            command: "npx",
            args: ["@spectrai/mcp-github"],
            env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
          },
          tools: [
            "create_issue",
            "list_prs",
            "merge_pr",
            "trigger_workflow",
          ],
        },
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
          steps: [
            { name: "search", agent: "researcher", prompt: "Search for papers on the topic" },
            { name: "summarize", agent: "summarizer", prompt: "Summarize key findings" },
            { name: "report", agent: "writer", prompt: "Generate a formatted report" },
          ],
        },
        authorId: charlie.id,
        tags: ["research", "academic", "automation"],
        version: "1.0.0",
        isPublished: true,
        downloads: 45,
        likes: 12,
      },
    ])
    .returning();

  console.log(`Created ${resourceData.length} resources`);

  // ── Create demo comments ───────────────────────────────
  await db.insert(schema.resourceComments).values([
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
  ]);

  console.log("Created 3 comments");

  // ── Create demo likes ──────────────────────────────────
  await db.insert(schema.resourceLikes).values([
    { resourceId: resourceData[0].id, userId: bob.id },
    { resourceId: resourceData[0].id, userId: charlie.id },
    { resourceId: resourceData[3].id, userId: alice.id },
    { resourceId: resourceData[3].id, userId: charlie.id },
  ]);

  console.log("Created 4 likes");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
