import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const env = {
    CLAUDEOPS_API_BASE_URL: "https://claudeops.test/api",
    INTERNAL_SERVICE_SECRET: "test-internal-service-secret",
  };

  const onConflictDoUpdate = vi.fn();
  const insertValues = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values: insertValues }));
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const execute = vi.fn();

  return {
    env,
    db: { insert, update, execute },
    insert,
    insertValues,
    onConflictDoUpdate,
    update,
    updateSet,
    updateWhere,
    execute,
  };
});

vi.mock("../config/env.js", () => ({
  getEnv: () => mocks.env,
}));

vi.mock("../db/index.js", () => ({
  db: mocks.db,
}));

import {
  buildSignedMembershipGrantRequest,
  grantClaudeOpsMembershipDays,
} from "../lib/claudeops-membership-client.js";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function expectValidSignature(sentBody: string, secret = mocks.env.INTERNAL_SERVICE_SECRET) {
  const sent = JSON.parse(sentBody) as Record<string, unknown>;
  const { sig, ...unsignedPayload } = sent;
  const rawBody = JSON.stringify(unsignedPayload);
  const expectedSig = createHmac("sha256", secret)
    .update(`${sent.ts}.${rawBody}`)
    .digest("hex");

  expect(sig).toBe(expectedSig);
  return sent;
}

describe("claudeops-membership-client", () => {
  beforeEach(() => {
    process.env.INTERNAL_SERVICE_SECRET = mocks.env.INTERNAL_SERVICE_SECRET;
    mocks.env.CLAUDEOPS_API_BASE_URL = "https://claudeops.test/api";
    mocks.env.INTERNAL_SERVICE_SECRET = "test-internal-service-secret";
    mocks.onConflictDoUpdate.mockResolvedValue([]);
    mocks.updateWhere.mockResolvedValue([]);
    mocks.execute.mockResolvedValue([]);
  });

  it("builds deterministic HMAC signature from ts + rawBody", () => {
    const request = buildSignedMembershipGrantRequest(
      {
        claudeopsUuid: "claudeops-user-1",
        days: 7,
        source: "invite_trial",
        note: "welcome",
        requestId: "req-signature",
      },
      mocks.env.INTERNAL_SERVICE_SECRET,
      { nowSeconds: () => 1710000000 }
    );

    expect(request.rawBody).toBe(
      JSON.stringify({
        claudeopsUuid: "claudeops-user-1",
        days: 7,
        plan: "pro",
        source: "invite_trial",
        note: "welcome",
        requestId: "req-signature",
        ts: 1710000000,
      })
    );

    const expectedSig = createHmac("sha256", mocks.env.INTERNAL_SERVICE_SECRET)
      .update(`1710000000.${request.rawBody}`)
      .digest("hex");

    expect(request.sig).toBe(expectedSig);
    expect(JSON.parse(request.body)).toEqual({
      claudeopsUuid: "claudeops-user-1",
      days: 7,
      plan: "pro",
      source: "invite_trial",
      note: "welcome",
      requestId: "req-signature",
      ts: 1710000000,
      sig: expectedSig,
    });
  });

  it("returns ok response and does not write outbox on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        plan: "pro",
        plan_expires_at: "2026-06-19T00:00:00Z",
      })
    );

    const result = await grantClaudeOpsMembershipDays(
      {
        claudeopsUuid: "claudeops-user-2",
        days: 7,
        source: "invite_trial",
        note: "invite welcome trial",
        requestId: "req-success",
      },
      {
        fetchImpl: fetchMock as unknown as typeof fetch,
        nowSeconds: () => 1710000001,
      }
    );

    expect(result).toEqual({
      ok: true,
      plan: "pro",
      plan_expires_at: "2026-06-19T00:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://claudeops.test/internal/grant-membership-days",
      expect.objectContaining({ method: "POST" })
    );
    expect(mocks.insert).not.toHaveBeenCalled();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const sent = expectValidSignature(String(init.body));
    expect(sent).toMatchObject({
      claudeopsUuid: "claudeops-user-2",
      days: 7,
      plan: "pro",
      source: "invite_trial",
      note: "invite welcome trial",
      requestId: "req-success",
      ts: 1710000001,
    });
  });

  it("writes membership_grant_outbox when a non-retryable response fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("bad signature", { status: 401, statusText: "Unauthorized" })
    );

    await expect(
      grantClaudeOpsMembershipDays(
        {
          claudeopsUuid: "claudeops-user-3",
          days: 7,
          source: "invite_trial",
          note: "should persist outbox",
          requestId: "req-fail",
        },
        {
          fetchImpl: fetchMock as unknown as typeof fetch,
          nowSeconds: () => 1710000002,
        }
      )
    ).rejects.toMatchObject({
      requestId: "req-fail",
      retryable: false,
      status: 401,
      attempts: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledTimes(1);

    const outboxRecord = mocks.insertValues.mock.calls[0][0];
    expect(outboxRecord).toMatchObject({
      requestId: "req-fail",
      status: "pending",
      attempts: 1,
      payload: {
        claudeopsUuid: "claudeops-user-3",
        days: 7,
        plan: "pro",
        source: "invite_trial",
        note: "should persist outbox",
        requestId: "req-fail",
        ts: 1710000002,
      },
    });
    expect(outboxRecord.lastError).toContain("401");
    expect(outboxRecord.nextRetryAt).toBeInstanceOf(Date);
  });

  it("retries retryable 5xx responses and succeeds without outbox", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary", { status: 502, statusText: "Bad Gateway" }))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          plan: "pro",
          plan_expires_at: "2026-06-20T00:00:00Z",
        })
      );

    const result = await grantClaudeOpsMembershipDays(
      {
        userId: "claudeops-numeric-user-id",
        days: 3,
        source: "promoter_reward",
        note: "retry once",
        requestId: "req-retry",
      },
      {
        fetchImpl: fetchMock as unknown as typeof fetch,
        maxRetries: 1,
        retryDelaysMs: [0],
        nowSeconds: () => 1710000003,
      }
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.insert).not.toHaveBeenCalled();

    const firstInit = fetchMock.mock.calls[0][1] as RequestInit;
    const secondInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(firstInit.body).toBe(secondInit.body);
    const sent = expectValidSignature(String(secondInit.body));
    expect(sent).toMatchObject({
      userId: "claudeops-numeric-user-id",
      days: 3,
      plan: "pro",
      source: "promoter_reward",
      note: "retry once",
      requestId: "req-retry",
      ts: 1710000003,
    });
  });
});