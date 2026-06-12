import { createHmac, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getEnv } from "../config/env.js";
import { db } from "../db/index.js";
import { membershipGrantOutbox } from "../db/schema.js";

export type MembershipGrantPlan = "pro";
export type MembershipGrantOutboxStatus = "pending" | "sent" | "dead";

export interface GrantMembershipDaysInput {
  claudeopsUuid?: string;
  userId?: string;
  days: number;
  plan?: MembershipGrantPlan;
  source: string;
  note?: string;
  requestId?: string;
}

export interface GrantMembershipDaysResponse {
  ok: boolean;
  plan: string;
  plan_expires_at: string;
}

export interface MembershipGrantPayload {
  claudeopsUuid?: string;
  userId?: string;
  days: number;
  plan: MembershipGrantPlan;
  source: string;
  note: string;
  requestId: string;
  ts: number;
}

export interface SignedMembershipGrantRequest {
  payload: MembershipGrantPayload;
  rawBody: string;
  body: string;
  sig: string;
}

export interface GrantMembershipClientOptions {
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryDelaysMs?: number[];
  writeOutboxOnFailure?: boolean;
  requestIdGenerator?: () => string;
  nowSeconds?: () => number;
}

interface OutboxRecord {
  requestId: string;
  payload: MembershipGrantPayload;
  status: MembershipGrantOutboxStatus;
  attempts: number;
  lastError?: string;
  nextRetryAt?: Date;
  processedAt?: Date | null;
}

interface RetryableOutboxRow {
  requestId: string;
  payload: MembershipGrantPayload | string;
  attempts: number | string;
}

interface GrantAttemptResult {
  response: GrantMembershipDaysResponse;
  attempts: number;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;
const MAX_LAST_ERROR_LENGTH = 2000;
const OUTBOX_RETRY_DELAY_MS = 5 * 60 * 1000;

export class ClaudeOpsMembershipGrantError extends Error {
  readonly requestId: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly attempts: number;
  readonly cause?: unknown;

  constructor(message: string, options: {
    requestId: string;
    retryable: boolean;
    status?: number;
    attempts: number;
    cause?: unknown;
  }) {
    super(message);
    this.name = "ClaudeOpsMembershipGrantError";
    this.requestId = options.requestId;
    this.retryable = options.retryable;
    this.status = options.status;
    this.attempts = options.attempts;
    this.cause = options.cause;
  }
}

function assertValidGrantInput(input: GrantMembershipDaysInput) {
  if (!input.claudeopsUuid && !input.userId) {
    throw new Error("claudeopsUuid or userId is required");
  }

  if (input.claudeopsUuid && input.userId) {
    throw new Error("Only one of claudeopsUuid or userId may be provided");
  }

  if (!Number.isInteger(input.days) || input.days <= 0) {
    throw new Error("days must be a positive integer");
  }

  if (input.plan && input.plan !== "pro") {
    throw new Error("plan must be pro");
  }

  if (!input.source) {
    throw new Error("source is required");
  }
}

function getInternalServiceSecret() {
  const secret = process.env.INTERNAL_SERVICE_SECRET || getEnv().INTERNAL_SERVICE_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_SERVICE_SECRET environment variable is required");
  }
  return secret;
}

function getClaudeOpsGrantUrl() {
  const baseUrl = getEnv().CLAUDEOPS_API_BASE_URL.replace(/\/+$/, "");
  const internalBaseUrl = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
  return `${internalBaseUrl}/internal/grant-membership-days`;
}

function truncateLastError(error: string | undefined) {
  if (!error) return undefined;
  return error.length > MAX_LAST_ERROR_LENGTH
    ? error.slice(0, MAX_LAST_ERROR_LENGTH)
    : error;
}

function getRetryDelayMs(attemptIndex: number, options: GrantMembershipClientOptions) {
  if (options.retryDelaysMs && attemptIndex - 1 < options.retryDelaysMs.length) {
    return options.retryDelaysMs[attemptIndex - 1];
  }

  const baseDelay = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
  return baseDelay * 2 ** Math.max(0, attemptIndex - 1);
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createRequestId(generator?: () => string) {
  return generator ? generator() : `membership_grant_${randomUUID()}`;
}

export function signMembershipGrantBody(secret: string, ts: number, rawBody: string) {
  return createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");
}

export function buildSignedMembershipGrantRequest(
  input: GrantMembershipDaysInput,
  secret: string,
  options: Pick<GrantMembershipClientOptions, "requestIdGenerator" | "nowSeconds"> = {}
): SignedMembershipGrantRequest {
  assertValidGrantInput(input);

  const ts = options.nowSeconds?.() ?? Math.floor(Date.now() / 1000);
  const requestId = input.requestId || createRequestId(options.requestIdGenerator);

  const basePayload = {
    days: input.days,
    plan: input.plan ?? "pro",
    source: input.source,
    note: input.note ?? "",
    requestId,
    ts,
  } satisfies Omit<MembershipGrantPayload, "claudeopsUuid" | "userId">;

  const payload: MembershipGrantPayload = input.claudeopsUuid
    ? { claudeopsUuid: input.claudeopsUuid, ...basePayload }
    : { userId: input.userId!, ...basePayload };

  const rawBody = JSON.stringify(payload);
  const sig = signMembershipGrantBody(secret, ts, rawBody);
  const body = JSON.stringify({ ...payload, sig });

  return { payload, rawBody, body, sig };
}

async function parseErrorBody(response: Response) {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function parseSuccessBody(response: Response): Promise<GrantMembershipDaysResponse> {
  const body = await response.json().catch(() => null) as Partial<GrantMembershipDaysResponse> | null;
  if (!body || body.ok !== true || !body.plan || !body.plan_expires_at) {
    throw new Error("Invalid ClaudeOps grant-membership-days response");
  }
  return body as GrantMembershipDaysResponse;
}

function toGrantError(error: unknown, requestId: string, attempts: number): ClaudeOpsMembershipGrantError {
  if (error instanceof ClaudeOpsMembershipGrantError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new ClaudeOpsMembershipGrantError(message, {
    requestId,
    retryable: true,
    attempts,
    cause: error,
  });
}

function shouldRetryStatus(status: number) {
  return status >= 500;
}

async function attemptGrant(
  request: SignedMembershipGrantRequest,
  options: GrantMembershipClientOptions
): Promise<GrantAttemptResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxAttempts = maxRetries + 1;
  let lastError: ClaudeOpsMembershipGrantError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(getClaudeOpsGrantUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: request.body,
      });

      if (response.ok) {
        return {
          response: await parseSuccessBody(response),
          attempts: attempt,
        };
      }

      const errorBody = await parseErrorBody(response);
      const retryable = shouldRetryStatus(response.status);
      lastError = new ClaudeOpsMembershipGrantError(
        `ClaudeOps grant-membership-days failed with ${response.status}: ${errorBody}`,
        {
          requestId: request.payload.requestId,
          retryable,
          status: response.status,
          attempts: attempt,
        }
      );

      if (!retryable || attempt >= maxAttempts) {
        throw lastError;
      }
    } catch (error) {
      const grantError = toGrantError(error, request.payload.requestId, attempt);
      lastError = grantError;

      if (!grantError.retryable || attempt >= maxAttempts) {
        throw grantError;
      }
    }

    await sleep(getRetryDelayMs(attempt, options));
  }

  throw lastError ?? new ClaudeOpsMembershipGrantError(
    "ClaudeOps grant-membership-days failed",
    {
      requestId: request.payload.requestId,
      retryable: true,
      attempts: maxAttempts,
    }
  );
}

async function upsertMembershipGrantOutbox(record: OutboxRecord) {
  await db
    .insert(membershipGrantOutbox)
    .values({
      requestId: record.requestId,
      payload: record.payload,
      status: record.status,
      attempts: record.attempts,
      lastError: truncateLastError(record.lastError),
      nextRetryAt: record.nextRetryAt ?? new Date(Date.now() + OUTBOX_RETRY_DELAY_MS),
      processedAt: record.processedAt ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: membershipGrantOutbox.requestId,
      set: {
        payload: record.payload,
        status: record.status,
        attempts: record.attempts,
        lastError: truncateLastError(record.lastError),
        nextRetryAt: record.nextRetryAt ?? new Date(Date.now() + OUTBOX_RETRY_DELAY_MS),
        processedAt: record.processedAt ?? null,
        updatedAt: new Date(),
      },
    });
}

async function markMembershipGrantOutboxSent(requestId: string, attempts: number) {
  await db
    .update(membershipGrantOutbox)
    .set({
      status: "sent",
      attempts,
      lastError: null,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(membershipGrantOutbox.requestId, requestId));
}

async function markMembershipGrantOutboxPending(
  requestId: string,
  attempts: number,
  error: string
) {
  await db
    .update(membershipGrantOutbox)
    .set({
      status: "pending",
      attempts,
      lastError: truncateLastError(error),
      nextRetryAt: new Date(Date.now() + OUTBOX_RETRY_DELAY_MS),
      updatedAt: new Date(),
    })
    .where(eq(membershipGrantOutbox.requestId, requestId));
}

export async function grantClaudeOpsMembershipDays(
  input: GrantMembershipDaysInput,
  options: GrantMembershipClientOptions = {}
): Promise<GrantMembershipDaysResponse> {
  const secret = getInternalServiceSecret();
  const signedRequest = buildSignedMembershipGrantRequest(input, secret, options);
  const writeOutboxOnFailure = options.writeOutboxOnFailure ?? true;

  try {
    const result = await attemptGrant(signedRequest, options);
    return result.response;
  } catch (error) {
    const grantError = toGrantError(error, signedRequest.payload.requestId, 1);

    if (writeOutboxOnFailure) {
      await upsertMembershipGrantOutbox({
        requestId: signedRequest.payload.requestId,
        payload: signedRequest.payload,
        status: "pending",
        attempts: grantError.attempts,
        lastError: grantError.message,
        nextRetryAt: new Date(Date.now() + OUTBOX_RETRY_DELAY_MS),
      });
    }

    throw grantError;
  }
}

function parseOutboxPayload(payload: RetryableOutboxRow["payload"]): MembershipGrantPayload {
  if (typeof payload === "string") {
    return JSON.parse(payload) as MembershipGrantPayload;
  }
  return payload;
}

export async function retryPendingMembershipGrantOutbox(options: GrantMembershipClientOptions & { limit?: number } = {}) {
  const limit = options.limit ?? 50;
  const rows = await db.execute(sql`
    SELECT
      request_id AS "requestId",
      payload,
      attempts
    FROM membership_grant_outbox
    WHERE status = 'pending'
      AND next_retry_at <= now()
    ORDER BY next_retry_at ASC, created_at ASC
    LIMIT ${limit}
  `) as unknown as RetryableOutboxRow[];

  let sent = 0;
  let failed = 0;
  const processedRequestIds: string[] = [];

  for (const row of rows) {
    const payload = parseOutboxPayload(row.payload);
    const existingAttempts = Number(row.attempts) || 0;

    try {
      await grantClaudeOpsMembershipDays(
        {
          claudeopsUuid: payload.claudeopsUuid,
          userId: payload.userId,
          days: payload.days,
          plan: payload.plan,
          source: payload.source,
          note: payload.note,
          requestId: row.requestId,
        },
        {
          ...options,
          writeOutboxOnFailure: false,
        }
      );

      sent += 1;
      processedRequestIds.push(row.requestId);
      await markMembershipGrantOutboxSent(row.requestId, existingAttempts + 1);
    } catch (error) {
      failed += 1;
      processedRequestIds.push(row.requestId);
      const grantError = toGrantError(error, row.requestId, 1);
      await markMembershipGrantOutboxPending(
        row.requestId,
        existingAttempts + grantError.attempts,
        grantError.message
      );
    }
  }

  return {
    total: rows.length,
    sent,
    failed,
    processedRequestIds,
  };
}