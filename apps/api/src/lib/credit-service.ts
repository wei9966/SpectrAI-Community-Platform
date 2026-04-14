import { sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";

interface QueryExecutor {
  execute: (query: SQL<unknown>) => Promise<unknown>;
}

interface CreditAccountRow {
  balance: number | string;
  frozen: number | string;
  lifetime_earned: number | string;
}

interface CreditRuleRow {
  points: number | string;
  daily_limit: number | string | null;
  min_trust_level: number | string;
  is_active: boolean;
}

export interface CreditMutationResult {
  userId: string;
  balance: number;
  frozen: number;
  lifetimeEarned: number;
  amount: number;
  action: string;
  refId: string | null;
  refType: string | null;
  note: string | null;
}

export interface CreditTransferResult {
  fromUserId: string;
  toUserId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  senderBalance: number;
  recipientBalance: number;
}

export interface TransferOptions {
  action?: string;
  refId?: string;
  refType?: string;
  note?: string;
  executor?: QueryExecutor;
}

function asRows<T>(result: unknown): T[] {
  return result as T[];
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function ensurePositiveAmount(amount: number): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Amount must be a positive integer");
  }
  return amount;
}

async function ensureAccount(executor: QueryExecutor, userId: string) {
  await executor.execute(sql`
    INSERT INTO credit_accounts (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `);
}

async function lockAccount(executor: QueryExecutor, userId: string) {
  await ensureAccount(executor, userId);

  const rows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      SELECT balance, frozen, lifetime_earned
      FROM credit_accounts
      WHERE user_id = ${userId}
      FOR UPDATE
    `)
  );

  const account = rows[0];
  if (!account) {
    throw new Error("Credit account not found");
  }

  return account;
}

async function insertTransaction(
  executor: QueryExecutor,
  userId: string,
  type: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string
) {
  await executor.execute(sql`
    INSERT INTO credit_transactions (
      user_id,
      type,
      amount,
      action,
      ref_id,
      ref_type,
      note
    )
    VALUES (
      ${userId},
      ${type},
      ${amount},
      ${action},
      ${refId ?? null},
      ${refType ?? null},
      ${note ?? null}
    )
  `);
}

async function getRule(executor: QueryExecutor, action: string) {
  const rows = asRows<CreditRuleRow>(
    await executor.execute(sql`
      SELECT points, daily_limit, min_trust_level, is_active
      FROM credit_rules
      WHERE action = ${action}
      LIMIT 1
    `)
  );

  return rows[0] ?? null;
}

async function getTrustLevel(executor: QueryExecutor, userId: string) {
  const rows = asRows<{ level: number | string }>(
    await executor.execute(sql`
      SELECT level
      FROM trust_levels
      WHERE user_id = ${userId}
      LIMIT 1
    `)
  );

  return toNumber(rows[0]?.level);
}

async function countTodayAwards(executor: QueryExecutor, userId: string, action: string) {
  const rows = asRows<{ count: number | string }>(
    await executor.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM credit_transactions
      WHERE user_id = ${userId}
        AND action = ${action}
        AND type = 'earn'
        AND created_at >= date_trunc('day', now())
    `)
  );

  return toNumber(rows[0]?.count);
}

async function awardInternal(
  executor: QueryExecutor,
  userId: string,
  action: string,
  refId?: string,
  refType?: string,
  note?: string
) {
  const rule = await getRule(executor, action);

  if (!rule || !rule.is_active) {
    return null;
  }

  const points = toNumber(rule.points);
  const dailyLimit =
    rule.daily_limit === null ? null : toNumber(rule.daily_limit);
  const minTrustLevel = toNumber(rule.min_trust_level);

  if (minTrustLevel > 0) {
    const trustLevel = await getTrustLevel(executor, userId);
    if (trustLevel < minTrustLevel) {
      return null;
    }
  }

  if (dailyLimit !== null) {
    const awardCount = await countTodayAwards(executor, userId, action);
    if (awardCount >= dailyLimit) {
      return null;
    }
  }

  await lockAccount(executor, userId);

  const rows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      UPDATE credit_accounts
      SET balance = balance + ${points},
          lifetime_earned = lifetime_earned + ${points},
          updated_at = now()
      WHERE user_id = ${userId}
      RETURNING balance, frozen, lifetime_earned
    `)
  );

  const account = rows[0];
  if (!account) {
    throw new Error("Failed to award credits");
  }

  await insertTransaction(executor, userId, "earn", points, action, refId, refType, note);

  return {
    userId,
    balance: toNumber(account.balance),
    frozen: toNumber(account.frozen),
    lifetimeEarned: toNumber(account.lifetime_earned),
    amount: points,
    action,
    refId: refId ?? null,
    refType: refType ?? null,
    note: note ?? null,
  } satisfies CreditMutationResult;
}

async function spendInternal(
  executor: QueryExecutor,
  userId: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string
) {
  const normalizedAmount = ensurePositiveAmount(amount);
  const account = await lockAccount(executor, userId);

  if (toNumber(account.balance) < normalizedAmount) {
    throw new Error("Insufficient credit balance");
  }

  const rows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      UPDATE credit_accounts
      SET balance = balance - ${normalizedAmount},
          updated_at = now()
      WHERE user_id = ${userId}
      RETURNING balance, frozen, lifetime_earned
    `)
  );

  const updated = rows[0];
  if (!updated) {
    throw new Error("Failed to spend credits");
  }

  await insertTransaction(executor, userId, "spend", -normalizedAmount, action, refId, refType, note);

  return {
    userId,
    balance: toNumber(updated.balance),
    frozen: toNumber(updated.frozen),
    lifetimeEarned: toNumber(updated.lifetime_earned),
    amount: -normalizedAmount,
    action,
    refId: refId ?? null,
    refType: refType ?? null,
    note: note ?? null,
  } satisfies CreditMutationResult;
}

async function freezeInternal(
  executor: QueryExecutor,
  userId: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string
) {
  const normalizedAmount = ensurePositiveAmount(amount);
  const account = await lockAccount(executor, userId);

  if (toNumber(account.balance) < normalizedAmount) {
    throw new Error("Insufficient credit balance");
  }

  const rows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      UPDATE credit_accounts
      SET balance = balance - ${normalizedAmount},
          frozen = frozen + ${normalizedAmount},
          updated_at = now()
      WHERE user_id = ${userId}
      RETURNING balance, frozen, lifetime_earned
    `)
  );

  const updated = rows[0];
  if (!updated) {
    throw new Error("Failed to freeze credits");
  }

  await insertTransaction(executor, userId, "freeze", -normalizedAmount, action, refId, refType, note);

  return {
    userId,
    balance: toNumber(updated.balance),
    frozen: toNumber(updated.frozen),
    lifetimeEarned: toNumber(updated.lifetime_earned),
    amount: -normalizedAmount,
    action,
    refId: refId ?? null,
    refType: refType ?? null,
    note: note ?? null,
  } satisfies CreditMutationResult;
}

async function unfreezeInternal(
  executor: QueryExecutor,
  userId: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string
) {
  const normalizedAmount = ensurePositiveAmount(amount);
  const account = await lockAccount(executor, userId);

  if (toNumber(account.frozen) < normalizedAmount) {
    throw new Error("Insufficient frozen credit balance");
  }

  const rows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      UPDATE credit_accounts
      SET frozen = frozen - ${normalizedAmount},
          balance = balance + ${normalizedAmount},
          updated_at = now()
      WHERE user_id = ${userId}
      RETURNING balance, frozen, lifetime_earned
    `)
  );

  const updated = rows[0];
  if (!updated) {
    throw new Error("Failed to unfreeze credits");
  }

  await insertTransaction(executor, userId, "unfreeze", normalizedAmount, action, refId, refType, note);

  return {
    userId,
    balance: toNumber(updated.balance),
    frozen: toNumber(updated.frozen),
    lifetimeEarned: toNumber(updated.lifetime_earned),
    amount: normalizedAmount,
    action,
    refId: refId ?? null,
    refType: refType ?? null,
    note: note ?? null,
  } satisfies CreditMutationResult;
}

async function transferInternal(
  executor: QueryExecutor,
  fromUserId: string,
  toUserId: string,
  amount: number,
  platformFeeRate: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string
) {
  const normalizedAmount = ensurePositiveAmount(amount);

  if (fromUserId === toUserId) {
    throw new Error("Cannot transfer credits to yourself");
  }

  const [firstUserId, secondUserId] = [fromUserId, toUserId].sort();
  await lockAccount(executor, firstUserId);
  await lockAccount(executor, secondUserId);

  const senderRows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      SELECT balance, frozen, lifetime_earned
      FROM credit_accounts
      WHERE user_id = ${fromUserId}
      FOR UPDATE
    `)
  );

  const senderAccount = senderRows[0];
  if (!senderAccount || toNumber(senderAccount.balance) < normalizedAmount) {
    throw new Error("Insufficient credit balance");
  }

  const safeFeeRate = Math.max(0, Math.min(platformFeeRate, 1));
  const platformFee = Math.floor(normalizedAmount * safeFeeRate);
  const netAmount = normalizedAmount - platformFee;

  const updatedSenderRows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      UPDATE credit_accounts
      SET balance = balance - ${normalizedAmount},
          updated_at = now()
      WHERE user_id = ${fromUserId}
      RETURNING balance, frozen, lifetime_earned
    `)
  );

  const updatedRecipientRows = asRows<CreditAccountRow>(
    await executor.execute(sql`
      UPDATE credit_accounts
      SET balance = balance + ${netAmount},
          updated_at = now()
      WHERE user_id = ${toUserId}
      RETURNING balance, frozen, lifetime_earned
    `)
  );

  const sender = updatedSenderRows[0];
  const recipient = updatedRecipientRows[0];

  if (!sender || !recipient) {
    throw new Error("Failed to transfer credits");
  }

  await insertTransaction(executor, fromUserId, "transfer", -normalizedAmount, action, refId, refType, note);
  await insertTransaction(executor, toUserId, "transfer", netAmount, action, refId, refType, note);

  return {
    fromUserId,
    toUserId,
    amount: normalizedAmount,
    platformFee,
    netAmount,
    senderBalance: toNumber(sender.balance),
    recipientBalance: toNumber(recipient.balance),
  } satisfies CreditTransferResult;
}

export async function awardCredits(
  userId: string,
  action: string,
  refId?: string,
  refType?: string,
  note?: string,
  executor?: QueryExecutor
) {
  if (executor) {
    return awardInternal(executor, userId, action, refId, refType, note);
  }

  return db.transaction((tx) =>
    awardInternal(tx as unknown as QueryExecutor, userId, action, refId, refType, note)
  );
}

export async function spendCredits(
  userId: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string,
  executor?: QueryExecutor
) {
  if (executor) {
    return spendInternal(executor, userId, amount, action, refId, refType, note);
  }

  return db.transaction((tx) =>
    spendInternal(tx as unknown as QueryExecutor, userId, amount, action, refId, refType, note)
  );
}

export async function freezeCredits(
  userId: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string,
  executor?: QueryExecutor
) {
  if (executor) {
    return freezeInternal(executor, userId, amount, action, refId, refType, note);
  }

  return db.transaction((tx) =>
    freezeInternal(tx as unknown as QueryExecutor, userId, amount, action, refId, refType, note)
  );
}

export async function unfreezeCredits(
  userId: string,
  amount: number,
  action: string,
  refId?: string,
  refType?: string,
  note?: string,
  executor?: QueryExecutor
) {
  if (executor) {
    return unfreezeInternal(executor, userId, amount, action, refId, refType, note);
  }

  return db.transaction((tx) =>
    unfreezeInternal(tx as unknown as QueryExecutor, userId, amount, action, refId, refType, note)
  );
}

export async function transferCredits(
  fromUserId: string,
  toUserId: string,
  amount: number,
  platformFeeRate: number,
  options: TransferOptions = {}
) {
  const action = options.action ?? "credit_transfer";

  if (options.executor) {
    return transferInternal(
      options.executor,
      fromUserId,
      toUserId,
      amount,
      platformFeeRate,
      action,
      options.refId,
      options.refType,
      options.note
    );
  }

  return db.transaction((tx) =>
    transferInternal(
      tx as unknown as QueryExecutor,
      fromUserId,
      toUserId,
      amount,
      platformFeeRate,
      action,
      options.refId,
      options.refType,
      options.note
    )
  );
}
