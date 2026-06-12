import { beforeEach, describe, expect, it, vi } from "vitest";

// Spy on the cross-repo client surface so we can assert the transactional enqueue
// happens on the *same* executor with a deterministic requestId, without hitting a DB.
const clientMocks = vi.hoisted(() => ({
  enqueueMembershipGrantOutbox: vi.fn(),
  dispatchMembershipGrantOutboxBestEffort: vi.fn(),
  isClaudeOpsIntegrationConfigured: vi.fn(() => true),
}));

const redisMocks = vi.hoisted(() => ({
  get: vi.fn(),
  setex: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  db: { execute: vi.fn(), transaction: vi.fn() },
}));

vi.mock("../lib/claudeops-membership-client.js", () => clientMocks);

vi.mock("../lib/redis.js", () => ({
  getRedis: () => redisMocks,
}));

vi.mock("../lib/credit-service.js", () => ({
  awardCredits: vi.fn(),
  freezeCredits: vi.fn(),
  unfreezeCredits: vi.fn(),
}));

vi.mock("../lib/notify.js", () => ({
  createNotification: vi.fn(),
}));

import { grantInviteeWelcome, releaseReward } from "../lib/promoter-service.js";

// Reconstruct the static SQL text from a drizzle `sql` object so the fake executor can
// route each query to a canned result regardless of call order. Params are separate
// chunks and render as empty, which is fine — we only match on table/column names.
function sqlText(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] })?.queryChunks ?? [];
  return chunks
    .map((chunk) => {
      if (typeof chunk === "string") return chunk;
      const value = (chunk as { value?: unknown }).value;
      if (Array.isArray(value)) return value.join("");
      if (typeof value === "string") return value;
      return "";
    })
    .join(" ");
}

interface ExecutorScenario {
  subscription?: Record<string, unknown>;
  claudeopsUuid?: string | null;
  reward?: Record<string, unknown>;
}

function createExecutor(scenario: ExecutorScenario) {
  const calls: string[] = [];
  const execute = vi.fn(async (query: unknown) => {
    const text = sqlText(query);
    calls.push(text);

    if (text.includes("claudeops_uuid")) {
      return [{ claudeopsUuid: scenario.claudeopsUuid ?? null }];
    }
    if (text.includes("FROM credit_transactions")) {
      return [];
    }
    if (text.includes("FROM plan_subscriptions")) {
      return scenario.subscription ? [scenario.subscription] : [];
    }
    if (text.includes("FROM promoter_rewards")) {
      return scenario.reward ? [scenario.reward] : [];
    }
    return [];
  });

  return { executor: { execute }, calls };
}

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const CONFIG = {
  enabled: true,
  rewardDelayHours: 168,
  inviteeWelcomeCredits: 0,
  inviteeWelcomeMembershipDays: 7,
  levels: {},
};

describe("cross-repo Pro membership writeback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMocks.isClaudeOpsIntegrationConfigured.mockReturnValue(true);
    redisMocks.get.mockResolvedValue(JSON.stringify(CONFIG));
  });

  it("invitee welcome (insert branch) enqueues a deterministic pro grant on the same executor", async () => {
    const { executor } = createExecutor({ claudeopsUuid: "A-uuid-invitee" });

    await grantInviteeWelcome("invitee-1", "invite-code-1", executor);

    expect(clientMocks.enqueueMembershipGrantOutbox).toHaveBeenCalledTimes(1);
    const [passedExecutor, payload] = clientMocks.enqueueMembershipGrantOutbox.mock.calls[0];
    // Atomicity: enqueue must use the caller's executor, not a global db handle.
    expect(passedExecutor).toBe(executor);
    expect(payload).toMatchObject({
      claudeopsUuid: "A-uuid-invitee",
      days: 7,
      plan: "pro",
      source: "invitee_welcome",
      requestId: "invitee_welcome:invite-code-1:invitee-1",
    });
  });

  it("produces a stable requestId across repeated invitee grants (idempotent)", async () => {
    const first = createExecutor({ claudeopsUuid: "A-uuid-invitee" });
    await grantInviteeWelcome("invitee-1", "invite-code-1", first.executor);

    const second = createExecutor({
      subscription: { id: "sub-1", plan: "community_vip", startsAt: new Date(), expiresAt: FUTURE },
      claudeopsUuid: "A-uuid-invitee",
    });
    await grantInviteeWelcome("invitee-1", "invite-code-1", second.executor);

    const firstRequestId = clientMocks.enqueueMembershipGrantOutbox.mock.calls[0][1].requestId;
    const secondRequestId = clientMocks.enqueueMembershipGrantOutbox.mock.calls[1][1].requestId;
    expect(firstRequestId).toBe(secondRequestId);
    expect(secondRequestId).toBe("invitee_welcome:invite-code-1:invitee-1");
  });

  it("promoter reward release (update branch) enqueues a pro grant keyed by reward id", async () => {
    const { executor, calls } = createExecutor({
      subscription: { id: "sub-9", plan: "community_vip", startsAt: new Date(), expiresAt: FUTURE },
      claudeopsUuid: "A-uuid-promoter",
      reward: {
        id: "reward-42",
        promoterUserId: "promoter-1",
        inviteeUserId: "invitee-9",
        inviteCodeId: null,
        rewardType: "membership_days",
        amount: 10,
        status: "pending",
        releaseAt: new Date(),
        releasedAt: null,
        createdAt: new Date(),
      },
    });

    await releaseReward("reward-42", executor);

    // Update branch must have run (existing active subscription extended).
    expect(calls.some((c) => c.includes("UPDATE plan_subscriptions"))).toBe(true);
    expect(clientMocks.enqueueMembershipGrantOutbox).toHaveBeenCalledTimes(1);
    const [passedExecutor, payload] = clientMocks.enqueueMembershipGrantOutbox.mock.calls[0];
    expect(passedExecutor).toBe(executor);
    expect(payload).toMatchObject({
      claudeopsUuid: "A-uuid-promoter",
      days: 10,
      plan: "pro",
      source: "promoter_reward",
      requestId: "promoter_reward:reward-42",
    });
  });

  it("skips cross-repo enqueue but still grants locally when claudeops_uuid is null", async () => {
    const { executor, calls } = createExecutor({ claudeopsUuid: null });

    await grantInviteeWelcome("invitee-unbound", "invite-code-2", executor);

    // No regression: the local grant (subscription insert + users update) still ran.
    expect(calls.some((c) => c.includes("INSERT INTO plan_subscriptions"))).toBe(true);
    expect(calls.some((c) => c.includes("UPDATE users"))).toBe(true);
    // But nothing was queued for the A-repo because the user has no A account.
    expect(clientMocks.enqueueMembershipGrantOutbox).not.toHaveBeenCalled();
  });
});
