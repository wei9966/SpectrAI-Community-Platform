import { fileURLToPath } from "node:url";
import { db } from "./index.js";
import * as schema from "./schema.js";

export const CREDITS_PER_DOLLAR = 1000;

export const TOKEN_PRICING = {
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4.1": { inputPer1M: 2.0, outputPer1M: 8.0 },
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-opus-4-6": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-haiku-4-5": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
} as const satisfies Record<string, { inputPer1M: number; outputPer1M: number }>;

export const MODEL_PRICING = TOKEN_PRICING;

export const INITIAL_CREDIT_RULES: Array<typeof schema.creditRules.$inferInsert> = [
  {
    action: "login_daily",
    points: 5,
    dailyLimit: 1,
    description: "Daily login reward",
  },
  {
    action: "login_streak_7",
    points: 20,
    description: "7-day login streak reward",
  },
  {
    action: "post_created",
    points: 10,
    dailyLimit: 5,
    description: "Create a forum post",
  },
  {
    action: "reply_created",
    points: 3,
    dailyLimit: 10,
    description: "Create a forum reply",
  },
  {
    action: "received_like",
    points: 2,
    description: "Receive a like from another user",
  },
  {
    action: "best_answer",
    points: 20,
    description: "Post marked as best answer",
  },
  {
    action: "resource_published",
    points: 30,
    description: "Publish a resource",
  },
  {
    action: "resource_downloaded",
    points: 1,
    dailyLimit: 100,
    description: "Resource downloaded by another user",
  },
  {
    action: "project_created",
    points: 50,
    description: "Create a showcase project",
  },
  {
    action: "invite_registered",
    points: 50,
    dailyLimit: 5,
    description: "Invited user completed registration",
  },
  {
    action: "invitee_first_post",
    points: 20,
    description: "Invited user created first post",
  },
  {
    action: "invitee_first_resource",
    points: 30,
    description: "Invited user published first resource",
  },
  {
    action: "github_pr_merged",
    points: 100,
    description: "Merged GitHub pull request",
  },
  {
    action: "bug_report_valid",
    points: 30,
    description: "Validated bug report",
  },
  {
    action: "tutorial_published",
    points: 50,
    description: "Published tutorial content",
  },
];

export async function seedCredits(): Promise<void> {
  const inserted = await db
    .insert(schema.creditRules)
    .values(INITIAL_CREDIT_RULES)
    .onConflictDoNothing()
    .returning({ action: schema.creditRules.action });

  console.log(`Seeded ${inserted.length} credit rules`);
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  seedCredits().catch((error) => {
    console.error("Failed to seed credit rules:", error);
    process.exit(1);
  });
}