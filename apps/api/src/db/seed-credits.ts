export interface CreditRuleSeed {
  action: string;
  points: number;
  dailyLimit: number | null;
  minTrustLevel: number;
  isActive: boolean;
  description: string;
}

export const CREDIT_RULE_SEEDS: CreditRuleSeed[] = [
  { action: "login_daily", points: 5, dailyLimit: 1, minTrustLevel: 0, isActive: true, description: "每日登录" },
  { action: "login_streak_7", points: 20, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "连续登录 7 天奖励" },
  { action: "post_created", points: 10, dailyLimit: 5, minTrustLevel: 1, isActive: true, description: "发布帖子" },
  { action: "reply_created", points: 3, dailyLimit: 10, minTrustLevel: 1, isActive: true, description: "回复帖子" },
  { action: "received_like", points: 2, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "收到点赞" },
  { action: "best_answer", points: 20, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "最佳答案" },
  { action: "resource_published", points: 30, dailyLimit: null, minTrustLevel: 2, isActive: true, description: "发布 Resource（审核通过后）" },
  { action: "resource_downloaded", points: 1, dailyLimit: 100, minTrustLevel: 0, isActive: true, description: "Resource 被下载" },
  { action: "project_created", points: 50, dailyLimit: null, minTrustLevel: 2, isActive: true, description: "上架 Showcase 项目" },
  { action: "invite_registered", points: 50, dailyLimit: 5, minTrustLevel: 0, isActive: true, description: "邀请用户注册" },
  { action: "invitee_first_post", points: 20, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "被邀请人首次发帖" },
  { action: "invitee_first_resource", points: 30, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "被邀请人首次发布 Resource" },
  { action: "github_pr_merged", points: 100, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "PR 合并到 SpectrAI" },
  { action: "bug_report_valid", points: 30, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "有效 Bug Report" },
  { action: "tutorial_published", points: 50, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "撰写教程/文档" },
  { action: "promoter_invite_bronze", points: 50, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "推广者青铜等级邀请奖励" },
  { action: "promoter_invite_silver", points: 80, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "推广者白银等级邀请奖励" },
  { action: "promoter_invite_gold", points: 120, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "推广者黄金等级邀请奖励" },
  { action: "promoter_invite_platinum", points: 200, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "推广者铂金等级邀请奖励" },
  { action: "promoter_invite_diamond", points: 300, dailyLimit: null, minTrustLevel: 0, isActive: true, description: "推广者钻石等级邀请奖励" },
];

export const CREDITS_PER_DOLLAR = 1000;

export const MODEL_PRICING = {
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4.1": { inputPer1M: 2, outputPer1M: 8 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "claude-sonnet-4-6": { inputPer1M: 3, outputPer1M: 15 },
  "claude-opus-4-6": { inputPer1M: 15, outputPer1M: 75 },
  "claude-haiku-4-5": { inputPer1M: 0.8, outputPer1M: 4 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
} as const;

export const PLAN_CREDIT_PRICING = {
  pro: { credits: 3000, durationDays: 30 },
  team: { credits: 8000, durationDays: 30 },
  community_vip: { credits: 2000, durationDays: 7 },
} as const;

export const MOBILE_ACCESS_CREDIT_COST = 2000;
export const TIP_PLATFORM_FEE_RATE = 0.05;
export const BOUNTY_PLATFORM_FEE_RATE = 0.05;
export const CDK_PLATFORM_FEE_RATE = 0.1;
