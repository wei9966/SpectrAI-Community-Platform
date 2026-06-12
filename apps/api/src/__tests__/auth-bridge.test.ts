import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { sign } from "jsonwebtoken";

// ── Mocks ─────────────────────────────────────────────────────
const mockEnv = vi.hoisted(() => ({
  PORT: 3000,
  NODE_ENV: "test",
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  JWT_SECRET: "test-jwt-secret-key-for-testing",
  CLAUDEOPS_JWT_SECRET: "test-claudeops-secret",
}));

vi.mock("../config/env.js", () => ({
  getEnv: () => mockEnv,
}));

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  db: mockDb,
}));

vi.mock("../db/schema.js", () => ({
  users: {},
}));

const inviteMocks = vi.hoisted(() => ({
  bindInviteCodeToUser: vi.fn(),
}));

vi.mock("../routes/invite.js", () => inviteMocks);

import authBridgeRoutes from "../routes/auth-bridge.js";

// ── Helpers ───────────────────────────────────────────────────
/** Build a drizzle-style select chain resolving to `rows`. */
function selectResolving(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  };
}

const LINKED_USER = {
  id: "community-user-1",
  username: "alice",
  email: "alice@example.com",
  passwordHash: "secret-hash",
  role: "user",
  claudeopsUuid: "A-uuid-1",
  claudeopsPlan: "pro",
};

function makeClaudeOpsToken(extra: Record<string, unknown> = {}) {
  return sign(
    {
      iss: "claudeops.wbdao.cn",
      type: "access",
      sub: "A-uuid-1",
      email: "alice@example.com",
      plan: "pro",
      ...extra,
    },
    mockEnv.CLAUDEOPS_JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
}

function buildApp() {
  const app = new Hono();
  app.route("/api/auth", authBridgeRoutes);
  return app;
}

async function callLink(body: Record<string, unknown>) {
  const app = buildApp();
  return app.request("/api/auth/claudeops/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/claudeops/link invite binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Single select in the already-linked path returns the linked user.
    mockDb.select.mockReturnValue(selectResolving([LINKED_USER]));
    mockDb.update.mockReturnValue({
      set: () => ({ where: () => Promise.resolve(undefined) }),
    });
  });

  it("binds the referral_code carried by the ClaudeOps token", async () => {
    inviteMocks.bindInviteCodeToUser.mockResolvedValue({
      bound: true,
      inviteId: "invite-1",
      inviterId: "promoter-1",
      code: "INVITE99",
      rewardStatus: "pending",
    });

    const token = makeClaudeOpsToken({ referral_code: "INVITE99" });
    const res = await callLink({ token });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.inviteBinding).toEqual({ status: "bound" });
    expect(inviteMocks.bindInviteCodeToUser).toHaveBeenCalledWith(
      "community-user-1",
      "INVITE99"
    );
  });

  it("keeps link successful when the invite code is already bound", async () => {
    inviteMocks.bindInviteCodeToUser.mockRejectedValue(
      new Error("Invite code already bound")
    );

    const token = makeClaudeOpsToken({ referral_code: "INVITE99" });
    const res = await callLink({ token });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.inviteBinding).toEqual({
      status: "skipped",
      reason: "Invite code already bound",
    });
  });

  it("surfaces an error status but still links on unexpected binding failure", async () => {
    inviteMocks.bindInviteCodeToUser.mockRejectedValue(
      new Error("db exploded")
    );

    const token = makeClaudeOpsToken({ referral_code: "INVITE99" });
    const res = await callLink({ token });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.inviteBinding).toEqual({
      status: "error",
      reason: "db exploded",
    });
  });

  it("falls back to inviteCode in the request body when token lacks referral_code", async () => {
    inviteMocks.bindInviteCodeToUser.mockResolvedValue({
      bound: true,
      inviteId: "invite-1",
      inviterId: "promoter-1",
      code: "BODYCODE1",
      rewardStatus: "pending",
    });

    const token = makeClaudeOpsToken();
    const res = await callLink({ token, inviteCode: "BODYCODE1" });

    expect(res.status).toBe(200);
    expect(inviteMocks.bindInviteCodeToUser).toHaveBeenCalledWith(
      "community-user-1",
      "BODYCODE1"
    );
  });

  it("skips binding when no invite code is present anywhere", async () => {
    const token = makeClaudeOpsToken();
    const res = await callLink({ token });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.inviteBinding).toEqual({
      status: "skipped",
      reason: "no_code",
    });
    expect(inviteMocks.bindInviteCodeToUser).not.toHaveBeenCalled();
  });
});
