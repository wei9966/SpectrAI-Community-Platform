import { sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { awardCredits, freezeCredits, unfreezeCredits } from "./credit-service.js";
import { getRedis } from "./redis.js";
import { createNotification } from "./notify.js";
import { promoterLevelEnum } from "../db/schema.js";

interface QueryExecutor {
  execute: (query: SQL<unknown>) => Promise<unknown>;
}

export type PromoterLevel = (typeof promoterLevelEnum.enumValues)[number];
export type PromoterRewardType = "credits" | "membership_days";

interface SettingRow {
  key: string;
  value: string;
}

interface ProfileRow {
  id: string;
  userId: string;
  level: PromoterLevel;
  totalInvites: number | string;
  totalCreditsEarned: number | string;
  createdAt: Date;
  updatedAt: Date;
}

interface RewardRow {
  id: string;
  promoterUserId: string;
  inviteeUserId: string;
  inviteCodeId: string | null;
  rewardType: PromoterRewardType;
  amount: number | string;
  status: "pending" | "released" | "expired" | "cancelled";
  releaseAt: Date;
  releasedAt: Date | null;
  createdAt: Date;
}

interface SubscriptionRow {
  id: string;
  plan: string;
  startsAt: Date;
  expiresAt: Date;
}

interface RewardSummaryItem {
  rewardId: string;
  type: PromoterRewardType;
  amount: number;
}

export interface PromoterConfig {
  enabled: boolean;
  rewardDelayHours: number;
  inviteeWelcomeCredits: number;
  levels: Record<PromoterLevel, {
    minInvites: number;
    credits: number;
    membershipDays: number;
    action: string;
  }>;
}

const PROMOTER_CONFIG_CACHE_KEY = "promoter:config";
const PROMOTER_CONFIG_TTL_SECONDS = 300;
const LEVEL_ORDER: PromoterLevel[] = ["bronze", "silver", "gold", "platinum", "diamond"];

const DEFAULT_PROMOTER_CONFIG: PromoterConfig = {
  enabled: true,
  rewardDelayHours: 168,
  inviteeWelcomeCredits: 100,
  levels: {
    bronze: { minInvites: 0, credits: 50, membershipDays: 0, action: "promoter_invite_bronze" },
    silver: { minInvites: 5, credits: 80, membershipDays: 3, action: "promoter_invite_silver" },
    gold: { minInvites: 20, credits: 120, membershipDays: 7, action: "promoter_invite_gold" },
    platinum: { minInvites: 50, credits: 200, membershipDays: 15, action: "promoter_invite_platinum" },
    diamond: { minInvites: 100, credits: 300, membershipDays: 30, action: "promoter_invite_diamond" },
  },
};

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

function toBoolean(value: string | null | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === "true" || value === "1";
}

function addHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

async function syncCreditRule(
  executor: QueryExecutor,
  action: string,
  points: number,
  description: string
) {
  await executor.execute(sql`
    INSERT INTO credit_rules (
      action,
      points,
      daily_limit,
      min_trust_level,
      is_active,
      description,
      updated_at
    )
    VALUES (
      ${action},
      ${points},
      null,
      0,
      true,
      ${description},
      now()
    )
    ON CONFLICT (action)
    DO UPDATE SET
      points = EXCLUDED.points,
      daily_limit = EXCLUDED.daily_limit,
      min_trust_level = EXCLUDED.min_trust_level,
      is_active = EXCLUDED.is_active,
      description = EXCLUDED.description,
      updated_at = now()
  `);
}

async function grantMembershipDaysInternal(
  executor: QueryExecutor,
  userId: string,
  days: number,
  source: string
) {
  if (!Number.isInteger(days) || days <= 0) {
    return null;
  }

  const currentRows = asRows<SubscriptionRow>(
    await executor.execute(sql`
      SELECT id, plan, starts_at AS "startsAt", expires_at AS "expiresAt"
      FROM plan_subscriptions
      WHERE user_id = ${userId}
        AND is_active = true
        AND expires_at > now()
      ORDER BY expires_at DESC
      LIMIT 1
      FOR UPDATE
    `)
  );

  const now = new Date();
  const current = currentRows[0];

  if (current) {
    const newExpiresAt = addDays(current.expiresAt > now ? current.expiresAt : now, days);

    await executor.execute(sql`
      UPDATE plan_subscriptions
      SET expires_at = ${newExpiresAt}
      WHERE id = ${current.id}
    `);

    await executor.execute(sql`
      UPDATE users
      SET claudeops_plan = ${current.plan},
          updated_at = now()
      WHERE id = ${userId}
    `);

    return {
      userId,
      plan: current.plan,
      startsAt: current.startsAt,
      expiresAt: newExpiresAt,
      days,
      source,
    };
  }

  const startsAt = now;
  const expiresAt = addDays(startsAt, days);

  await executor.execute(sql`
    INSERT INTO plan_subscriptions (
      user_id,
      plan,
      source,
      starts_at,
      expires_at,
      is_active
    )
    VALUES (
      ${userId},
      'community_vip',
      ${source},
      ${startsAt},
      ${expiresAt},
      true
    )
  `);

  await executor.execute(sql`
    UPDATE users
    SET claudeops_plan = 'community_vip',
        updated_at = now()
    WHERE id = ${userId}
  `);

  return {
    userId,
    plan: "community_vip",
    startsAt,
    expiresAt,
    days,
    source,
  };
}

async function getExistingProfile(executor: QueryExecutor, userId: string) {
  const rows = asRows<ProfileRow>(
    await executor.execute(sql`
      SELECT
        id,
        user_id AS "userId",
        level,
        total_invites AS "totalInvites",
        total_credits_earned AS "totalCreditsEarned",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM promoter_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `)
  );

  return rows[0] ?? null;
}

async function ensurePromoterProfileInternal(executor: QueryExecutor, userId: string) {
  await executor.execute(sql`
    INSERT INTO promoter_profiles (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `);

  const profile = await getExistingProfile(executor, userId);
  if (!profile) {
    throw new Error("Failed to load promoter profile");
  }

  return {
    ...profile,
    totalInvites: toNumber(profile.totalInvites),
    totalCreditsEarned: toNumber(profile.totalCreditsEarned),
  };
}

async function createPromoterRewardRow(
  executor: QueryExecutor,
  promoterUserId: string,
  inviteeUserId: string,
  inviteCodeId: string | undefined,
  rewardType: PromoterRewardType,
  amount: number,
  releaseAt: Date
) {
  const rows = asRows<{ id: string }>(
    await executor.execute(sql`
      INSERT INTO promoter_rewards (
        promoter_user_id,
        invitee_user_id,
        invite_code_id,
        reward_type,
        amount,
        status,
        release_at
      )
      VALUES (
        ${promoterUserId},
        ${inviteeUserId},
        ${inviteCodeId ?? null},
        ${rewardType},
        ${amount},
        'pending',
        ${releaseAt}
      )
      RETURNING id
    `)
  );

  return rows[0]?.id ?? null;
}

export async function getPromoterConfig(): Promise<PromoterConfig> {
  try {
    const redis = getRedis();
    const cached = await redis.get(PROMOTER_CONFIG_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as PromoterConfig;
    }
  } catch (error) {
    console.warn("[promoter] Failed to read promoter config cache:", error);
  }

  const rows = await db
    .execute(sql`
      SELECT key, value
      FROM system_settings
      WHERE key LIKE 'promoter.%'
    `)
    .then((result) => asRows<SettingRow>(result));

  const settings = new Map(rows.map((row) => [row.key, row.value]));

  const config: PromoterConfig = {
    enabled: toBoolean(settings.get("promoter.enabled"), DEFAULT_PROMOTER_CONFIG.enabled),
    rewardDelayHours: toNumber(settings.get("promoter.reward_delay_hours") ?? DEFAULT_PROMOTER_CONFIG.rewardDelayHours),
    inviteeWelcomeCredits: toNumber(settings.get("promoter.invitee_welcome_credits") ?? DEFAULT_PROMOTER_CONFIG.inviteeWelcomeCredits),
    levels: {
      bronze: {
        minInvites: 0,
        credits: toNumber(settings.get("promoter.invite_credits_bronze") ?? DEFAULT_PROMOTER_CONFIG.levels.bronze.credits),
        membershipDays: toNumber(settings.get("promoter.invite_membership_days_bronze") ?? DEFAULT_PROMOTER_CONFIG.levels.bronze.membershipDays),
        action: "promoter_invite_bronze",
      },
      silver: {
        minInvites: toNumber(settings.get("promoter.level_threshold_silver") ?? DEFAULT_PROMOTER_CONFIG.levels.silver.minInvites),
        credits: toNumber(settings.get("promoter.invite_credits_silver") ?? DEFAULT_PROMOTER_CONFIG.levels.silver.credits),
        membershipDays: toNumber(settings.get("promoter.invite_membership_days_silver") ?? DEFAULT_PROMOTER_CONFIG.levels.silver.membershipDays),
        action: "promoter_invite_silver",
      },
      gold: {
        minInvites: toNumber(settings.get("promoter.level_threshold_gold") ?? DEFAULT_PROMOTER_CONFIG.levels.gold.minInvites),
        credits: toNumber(settings.get("promoter.invite_credits_gold") ?? DEFAULT_PROMOTER_CONFIG.levels.gold.credits),
        membershipDays: toNumber(settings.get("promoter.invite_membership_days_gold") ?? DEFAULT_PROMOTER_CONFIG.levels.gold.membershipDays),
        action: "promoter_invite_gold",
      },
      platinum: {
        minInvites: toNumber(settings.get("promoter.level_threshold_platinum") ?? DEFAULT_PROMOTER_CONFIG.levels.platinum.minInvites),
        credits: toNumber(settings.get("promoter.invite_credits_platinum") ?? DEFAULT_PROMOTER_CONFIG.levels.platinum.credits),
        membershipDays: toNumber(settings.get("promoter.invite_membership_days_platinum") ?? DEFAULT_PROMOTER_CONFIG.levels.platinum.membershipDays),
        action: "promoter_invite_platinum",
      },
      diamond: {
        minInvites: toNumber(settings.get("promoter.level_threshold_diamond") ?? DEFAULT_PROMOTER_CONFIG.levels.diamond.minInvites),
        credits: toNumber(settings.get("promoter.invite_credits_diamond") ?? DEFAULT_PROMOTER_CONFIG.levels.diamond.credits),
        membershipDays: toNumber(settings.get("promoter.invite_membership_days_diamond") ?? DEFAULT_PROMOTER_CONFIG.levels.diamond.membershipDays),
        action: "promoter_invite_diamond",
      },
    },
  };

  try {
    const redis = getRedis();
    await redis.setex(PROMOTER_CONFIG_CACHE_KEY, PROMOTER_CONFIG_TTL_SECONDS, JSON.stringify(config));
  } catch (error) {
    console.warn("[promoter] Failed to cache promoter config:", error);
  }

  return config;
}

export function calculateLevel(totalInvites: number, config: PromoterConfig): PromoterLevel {
  if (totalInvites >= config.levels.diamond.minInvites) return "diamond";
  if (totalInvites >= config.levels.platinum.minInvites) return "platinum";
  if (totalInvites >= config.levels.gold.minInvites) return "gold";
  if (totalInvites >= config.levels.silver.minInvites) return "silver";
  return "bronze";
}

export async function getOrCreateProfile(userId: string, executor?: QueryExecutor) {
  if (executor) {
    return ensurePromoterProfileInternal(executor, userId);
  }

  return db.transaction((tx) =>
    ensurePromoterProfileInternal(tx as unknown as QueryExecutor, userId)
  );
}

async function processPromoterRewardInternal(
  executor: QueryExecutor,
  promoterUserId: string,
  inviteeUserId: string,
  inviteCodeId?: string
) {
  const config = await getPromoterConfig();
  if (!config.enabled) {
    return {
      enabled: false,
      promoterUserId,
      inviteeUserId,
      level: "bronze" as PromoterLevel,
      rewards: [] as RewardSummaryItem[],
      releaseAt: null,
    };
  }

  const duplicateRows = inviteCodeId
    ? asRows<{ id: string }>(
        await executor.execute(sql`
          SELECT id
          FROM promoter_rewards
          WHERE invite_code_id = ${inviteCodeId}
            AND promoter_user_id = ${promoterUserId}
          LIMIT 1
        `)
      )
    : [];

  if (duplicateRows[0]) {
    const profile = await ensurePromoterProfileInternal(executor, promoterUserId);
    return {
      enabled: true,
      promoterUserId,
      inviteeUserId,
      level: profile.level,
      rewards: [] as RewardSummaryItem[],
      releaseAt: null,
      duplicate: true,
    };
  }

  const profile = await ensurePromoterProfileInternal(executor, promoterUserId);
  const totalInvites = profile.totalInvites + 1;
  const level = calculateLevel(totalInvites, config);
  const levelConfig = config.levels[level];
  const releaseAt = addHours(config.rewardDelayHours);
  const rewards: RewardSummaryItem[] = [];

  let creditAmount = 0;
  if (levelConfig.credits > 0) {
    await syncCreditRule(
      executor,
      levelConfig.action,
      levelConfig.credits,
      `推广者 ${level} 等级邀请积分奖励`
    );

    const creditReward = await awardCredits(
      promoterUserId,
      levelConfig.action,
      inviteCodeId,
      "promoter_reward",
      `推广邀请奖励（${level}）`,
      executor
    );

    if (!creditReward) {
      throw new Error("Failed to award promoter credits");
    }

    creditAmount = creditReward.amount;

    await freezeCredits(
      promoterUserId,
      creditReward.amount,
      levelConfig.action,
      inviteCodeId,
      "promoter_reward",
      "推广邀请奖励冻结中",
      executor
    );

    const rewardId = await createPromoterRewardRow(
      executor,
      promoterUserId,
      inviteeUserId,
      inviteCodeId,
      "credits",
      creditReward.amount,
      releaseAt
    );

    if (rewardId) {
      rewards.push({ rewardId, type: "credits", amount: creditReward.amount });
    }
  }

  if (levelConfig.membershipDays > 0) {
    const rewardId = await createPromoterRewardRow(
      executor,
      promoterUserId,
      inviteeUserId,
      inviteCodeId,
      "membership_days",
      levelConfig.membershipDays,
      releaseAt
    );

    if (rewardId) {
      rewards.push({ rewardId, type: "membership_days", amount: levelConfig.membershipDays });
    }
  }

  await executor.execute(sql`
    UPDATE promoter_profiles
    SET level = ${level},
        total_invites = ${totalInvites},
        total_credits_earned = total_credits_earned + ${creditAmount},
        updated_at = now()
    WHERE user_id = ${promoterUserId}
  `);

  return {
    enabled: true,
    promoterUserId,
    inviteeUserId,
    level,
    rewards,
    releaseAt,
  };
}

export async function processPromoterReward(
  promoterUserId: string,
  inviteeUserId: string,
  inviteCodeId?: string,
  executor?: QueryExecutor
) {
  const result = executor
    ? await processPromoterRewardInternal(executor, promoterUserId, inviteeUserId, inviteCodeId)
    : await db.transaction((tx) =>
        processPromoterRewardInternal(
          tx as unknown as QueryExecutor,
          promoterUserId,
          inviteeUserId,
          inviteCodeId
        )
      );

  if (result.enabled && result.rewards.length > 0 && result.releaseAt) {
    await createNotification({
      type: "promoter_reward_pending",
      fromUserId: inviteeUserId,
      toUserId: promoterUserId,
      title: "新的推广奖励已生成",
      content: `你邀请的新用户已完成绑定，奖励将在 ${result.releaseAt.toISOString()} 后释放。`,
      relatedId: inviteCodeId,
      relatedType: "invite",
    });
  }

  return result;
}

async function grantInviteeWelcomeInternal(
  executor: QueryExecutor,
  inviteeUserId: string,
  inviteCodeId?: string
) {
  const config = await getPromoterConfig();
  if (!config.enabled || config.inviteeWelcomeCredits <= 0) {
    return null;
  }

  const existingRows = inviteCodeId
    ? asRows<{ id: string }>(
        await executor.execute(sql`
          SELECT id
          FROM credit_transactions
          WHERE user_id = ${inviteeUserId}
            AND action = 'invitee_welcome_bonus'
            AND ref_id = ${inviteCodeId}
          LIMIT 1
        `)
      )
    : [];

  if (existingRows[0]) {
    return null;
  }

  await syncCreditRule(
    executor,
    "invitee_welcome_bonus",
    config.inviteeWelcomeCredits,
    "被邀请用户欢迎积分"
  );

  return awardCredits(
    inviteeUserId,
    "invitee_welcome_bonus",
    inviteCodeId,
    "invite",
    "被邀请用户欢迎积分",
    executor
  );
}

export async function grantInviteeWelcome(
  inviteeUserId: string,
  inviteCodeId?: string,
  executor?: QueryExecutor
) {
  const result = executor
    ? await grantInviteeWelcomeInternal(executor, inviteeUserId, inviteCodeId)
    : await db.transaction((tx) =>
        grantInviteeWelcomeInternal(
          tx as unknown as QueryExecutor,
          inviteeUserId,
          inviteCodeId
        )
      );

  return result;
}

async function releaseRewardInternal(executor: QueryExecutor, rewardId: string) {
  const rows = asRows<RewardRow>(
    await executor.execute(sql`
      SELECT
        id,
        promoter_user_id AS "promoterUserId",
        invitee_user_id AS "inviteeUserId",
        invite_code_id AS "inviteCodeId",
        reward_type AS "rewardType",
        amount,
        status,
        release_at AS "releaseAt",
        released_at AS "releasedAt",
        created_at AS "createdAt"
      FROM promoter_rewards
      WHERE id = ${rewardId}
      LIMIT 1
      FOR UPDATE
    `)
  );

  const reward = rows[0];
  if (!reward) {
    throw new Error("Promoter reward not found");
  }

  if (reward.status !== "pending") {
    return {
      rewardId: reward.id,
      status: reward.status,
      rewardType: reward.rewardType,
      amount: toNumber(reward.amount),
    };
  }

  const amount = toNumber(reward.amount);

  if (reward.rewardType === "credits") {
    await unfreezeCredits(
      reward.promoterUserId,
      amount,
      "promoter_reward_release",
      reward.id,
      "promoter_reward",
      "推广积分奖励已释放",
      executor
    );
  } else {
    await grantMembershipDaysInternal(
      executor,
      reward.promoterUserId,
      amount,
      "promoter_reward"
    );
  }

  await executor.execute(sql`
    UPDATE promoter_rewards
    SET status = 'released',
        released_at = now()
    WHERE id = ${reward.id}
  `);

  if (reward.inviteCodeId) {
    const [pendingRow] = asRows<{ count: number | string }>(
      await executor.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM promoter_rewards
        WHERE invite_code_id = ${reward.inviteCodeId}
          AND status = 'pending'
      `)
    );

    if (toNumber(pendingRow?.count) === 0) {
      await executor.execute(sql`
        UPDATE invite_codes
        SET reward_status = 'granted'
        WHERE id = ${reward.inviteCodeId}
      `);
    }
  }

  return {
    rewardId: reward.id,
    status: "released" as const,
    rewardType: reward.rewardType,
    amount,
  };
}

export async function releaseReward(rewardId: string, executor?: QueryExecutor) {
  return executor
    ? releaseRewardInternal(executor, rewardId)
    : db.transaction((tx) => releaseRewardInternal(tx as unknown as QueryExecutor, rewardId));
}

export async function expireStaleRewards() {
  const dueRows = asRows<{ id: string }>(
    await db.execute(sql`
      SELECT id
      FROM promoter_rewards
      WHERE status = 'pending'
        AND release_at <= now()
      ORDER BY release_at ASC
      LIMIT 200
    `)
  );

  let released = 0;
  let expired = 0;
  const processedIds: string[] = [];

  for (const row of dueRows) {
    try {
      await releaseReward(row.id);
      released += 1;
      processedIds.push(row.id);
    } catch (error) {
      await db.execute(sql`
        UPDATE promoter_rewards
        SET status = 'expired',
            released_at = now()
        WHERE id = ${row.id}
      `);
      expired += 1;
      processedIds.push(row.id);
      console.error("[promoter] Failed to release reward, marked as expired:", error);
    }
  }

  return {
    total: dueRows.length,
    released,
    expired,
    processedIds,
  };
}

export async function batchReleasePendingRewards(rewardIds?: string[]) {
  const ids = rewardIds && rewardIds.length > 0
    ? rewardIds
    : asRows<{ id: string }>(
        await db.execute(sql`
          SELECT id
          FROM promoter_rewards
          WHERE status = 'pending'
            AND release_at <= now()
          ORDER BY release_at ASC
          LIMIT 200
        `)
      ).map((row) => row.id);

  const results = [] as Array<{ rewardId: string; status: string; rewardType: PromoterRewardType; amount: number }>;

  for (const rewardId of ids) {
    const released = await releaseReward(rewardId);
    results.push(released);
  }

  return {
    total: ids.length,
    items: results,
  };
}

export async function updatePromoterLevel(userId: string, level: PromoterLevel) {
  return db.transaction(async (tx) => {
    await ensurePromoterProfileInternal(tx as unknown as QueryExecutor, userId);

    await tx.execute(sql`
      UPDATE promoter_profiles
      SET level = ${level},
          updated_at = now()
      WHERE user_id = ${userId}
    `);

    const profile = await getExistingProfile(tx as unknown as QueryExecutor, userId);
    if (!profile) {
      throw new Error("Promoter profile not found");
    }

    return {
      ...profile,
      totalInvites: toNumber(profile.totalInvites),
      totalCreditsEarned: toNumber(profile.totalCreditsEarned),
    };
  });
}

export async function getPromoterStats(userId: string) {
  const profile = await getOrCreateProfile(userId);

  const rewardSummaryRows = asRows<{
    pendingCount: number | string;
    releasedCount: number | string;
    pendingCredits: number | string;
    releasedCredits: number | string;
    pendingDays: number | string;
    releasedDays: number | string;
  }>(
    await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingCount",
        COUNT(*) FILTER (WHERE status = 'released')::int AS "releasedCount",
        COALESCE(SUM(CASE WHEN status = 'pending' AND reward_type = 'credits' THEN amount ELSE 0 END), 0)::int AS "pendingCredits",
        COALESCE(SUM(CASE WHEN status = 'released' AND reward_type = 'credits' THEN amount ELSE 0 END), 0)::int AS "releasedCredits",
        COALESCE(SUM(CASE WHEN status = 'pending' AND reward_type = 'membership_days' THEN amount ELSE 0 END), 0)::int AS "pendingDays",
        COALESCE(SUM(CASE WHEN status = 'released' AND reward_type = 'membership_days' THEN amount ELSE 0 END), 0)::int AS "releasedDays"
      FROM promoter_rewards
      WHERE promoter_user_id = ${userId}
    `)
  );

  const rewardSummary = rewardSummaryRows[0] ?? {
    pendingCount: 0,
    releasedCount: 0,
    pendingCredits: 0,
    releasedCredits: 0,
    pendingDays: 0,
    releasedDays: 0,
  };

  return {
    profile,
    rewards: {
      pendingCount: toNumber(rewardSummary.pendingCount),
      releasedCount: toNumber(rewardSummary.releasedCount),
      pendingCredits: toNumber(rewardSummary.pendingCredits),
      releasedCredits: toNumber(rewardSummary.releasedCredits),
      pendingMembershipDays: toNumber(rewardSummary.pendingDays),
      releasedMembershipDays: toNumber(rewardSummary.releasedDays),
    },
  };
}

export async function listPromoterLevels() {
  const config = await getPromoterConfig();
  return LEVEL_ORDER.map((level) => ({
    level,
    ...config.levels[level],
  }));
}
