import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
}));

const redisMocks = vi.hoisted(() => ({
  get: vi.fn(),
  setex: vi.fn(),
}));

const creditMocks = vi.hoisted(() => ({
  awardCredits: vi.fn(),
  freezeCredits: vi.fn(),
  unfreezeCredits: vi.fn(),
}));

const clientMocks = vi.hoisted(() => ({
  enqueueMembershipGrantOutbox: vi.fn(),
  dispatchMembershipGrantOutboxBestEffort: vi.fn(),
}));

const notifyMocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  db: dbMocks,
}));

vi.mock("../lib/redis.js", () => ({
  getRedis: () => redisMocks,
}));

vi.mock("../lib/credit-service.js", () => creditMocks);

vi.mock("../lib/claudeops-membership-client.js", () => clientMocks);

vi.mock("../lib/notify.js", () => notifyMocks);

import { bindInviteCodeToUser } from "../routes/invite.js";
import { processPromoterReward } from "../lib/promoter-service.js";

function sqlText(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] })?.queryChunks ?? [];
  return chunks
    .map((chunk) => {
      if (typeof chunk === "string") return chunk;
      const value = (chunk as { value?: unknown })?.value;
      if (Array.isArray(value)) return value.join("");
      if (typeof value === "string") return value;
      return "";
    })
    .join(" ");
}

function sqlParamValues(query: unknown): unknown[] {
  const chunks = (query as { queryChunks?: unknown[] })?.queryChunks ?? [];
  return chunks.flatMap((chunk) => {
    if (chunk && typeof chunk === "object" && "value" in chunk && Array.isArray((chunk as { value: unknown }).value)) {
      return [];
    }
    return [chunk];
  });
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && value.endsWith("Z");
}

const CONFIG = {
  enabled: true,
  rewardDelayHours: 168,
  inviteeWelcomeCredits: 0,
  inviteeWelcomeMembershipDays: 7,
  levels: {
    bronze: { minInvites: 0, credits: 0, membershipDays: 7, action: "promoter_invite_bronze" },
    silver: { minInvites: 5, credits: 0, membershipDays: 10, action: "promoter_invite_silver" },
    gold: { minInvites: 20, credits: 0, membershipDays: 15, action: "promoter_invite_gold" },
    platinum: { minInvites: 50, credits: 0, membershipDays: 20, action: "promoter_invite_platinum" },
    diamond: { minInvites: 100, credits: 0, membershipDays: 30, action: "promoter_invite_diamond" },
  },
};

function createExecutor(options: { claudeopsUuid?: string | null } = {}) {
  let rewardId = 0;
  const execute = vi.fn(async (query: unknown) => {
    const text = sqlText(query);

    if (text.includes("FROM invite_codes") && text.includes("WHERE code")) {
      return [{ id: "invite-code-1", inviterId: "promoter-1", inviteeId: null }];
    }

    if (text.includes("FROM promoter_rewards")) {
      return [];
    }

    if (text.includes("FROM promoter_profiles")) {
      return [{
        id: "profile-1",
        userId: "promoter-1",
        level: "bronze",
        totalInvites: 0,
        totalCreditsEarned: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }];
    }

    if (text.includes("INSERT INTO promoter_rewards")) {
      rewardId += 1;
      return [{ id: `reward-${rewardId}` }];
    }

    if (text.includes("FROM credit_transactions")) {
      return [];
    }

    if (text.includes("FROM plan_subscriptions")) {
      return [];
    }

    if (text.includes("claudeops_uuid")) {
      return [{ claudeopsUuid: options.claudeopsUuid ?? "A-uuid-invitee" }];
    }

    return [];
  });

  return { execute };
}

describe("invite/promoter raw SQL timestamp serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.get.mockResolvedValue(JSON.stringify(CONFIG));
    redisMocks.setex.mockResolvedValue(undefined);
    creditMocks.awardCredits.mockResolvedValue({ amount: 0 });
    creditMocks.freezeCredits.mockResolvedValue(undefined);
    creditMocks.unfreezeCredits.mockResolvedValue(undefined);
    clientMocks.enqueueMembershipGrantOutbox.mockResolvedValue(undefined);
    clientMocks.dispatchMembershipGrantOutboxBestEffort.mockResolvedValue(undefined);
    notifyMocks.createNotification.mockResolvedValue(undefined);
    dbMocks.execute.mockResolvedValue([]);
  });

  it("processPromoterReward serializes promoter_rewards.release_at but still returns releaseAt as Date", async () => {
    const executor = createExecutor();

    const result = await processPromoterReward(
      "promoter-1",
      "invitee-1",
      "invite-code-1",
      executor
    );

    expect(result.releaseAt).toBeInstanceOf(Date);

    const rewardInsertQueries = executor.execute.mock.calls
      .map(([query]) => query)
      .filter((query) => sqlText(query).includes("INSERT INTO promoter_rewards"));

    expect(rewardInsertQueries).toHaveLength(1);
    expect(rewardInsertQueries.flatMap(sqlParamValues).some((value) => value instanceof Date)).toBe(false);
    expect(rewardInsertQueries.flatMap(sqlParamValues).some(isIsoTimestamp)).toBe(true);
  });

  it("bindInviteCodeToUser serializes timestamps and continues to welcome membership outbox", async () => {
    const executor = createExecutor({ claudeopsUuid: "A-uuid-invitee" });
    dbMocks.transaction.mockImplementation(async (callback: (tx: typeof executor) => Promise<unknown>) => callback(executor));

    const result = await bindInviteCodeToUser("invitee-1", " ef795a273d03 ");

    expect(result).toMatchObject({
      bound: true,
      inviteId: "invite-code-1",
      inviterId: "promoter-1",
      code: "EF795A273D03",
      rewardStatus: "pending",
    });

    const queries = executor.execute.mock.calls.map(([query]) => query);
    expect(queries.flatMap(sqlParamValues).some((value) => value instanceof Date)).toBe(false);

    const inviteStatusUpdate = queries.find((query) => sqlText(query).includes("reward_frozen_until"));
    expect(inviteStatusUpdate).toBeTruthy();
    expect(sqlParamValues(inviteStatusUpdate).some(isIsoTimestamp)).toBe(true);

    const subscriptionInsert = queries.find((query) => sqlText(query).includes("INSERT INTO plan_subscriptions"));
    expect(subscriptionInsert).toBeTruthy();
    expect(sqlParamValues(subscriptionInsert).filter(isIsoTimestamp)).toHaveLength(2);

    expect(clientMocks.enqueueMembershipGrantOutbox).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        claudeopsUuid: "A-uuid-invitee",
        days: 7,
        plan: "pro",
        source: "invitee_welcome",
        requestId: "invitee_welcome:invite-code-1:invitee-1",
      })
    );
    expect(clientMocks.dispatchMembershipGrantOutboxBestEffort).toHaveBeenCalledTimes(1);
  });
});
