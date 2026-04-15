export interface CreditBalance {
  balance: number;
  frozen: number;
  lifetimeEarned: number;
  trustLevel?: number;
}

export interface PeriodSummary {
  earned: number;
  spent: number;
}

export interface CreditSummary {
  today: PeriodSummary;
  week: PeriodSummary;
  month: PeriodSummary;
}

export interface TokenQuota {
  balanceUsd: number;
  lifetimeUsed: number;
  creditsPerDollar?: number;
}

export interface CreditTransaction {
  id: string;
  type: 'earn' | 'spend' | 'transfer' | 'freeze' | 'unfreeze';
  amount: number;
  action: string;
  refId?: string;
  refType?: string;
  note?: string;
  createdAt: string;
}

export interface PlanStatus {
  plan: string;
  source: string;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface ModelPricing {
  model: string;
  inputPer1M: number;
  outputPer1M: number;
}

export interface CreditTransactionsPage {
  items: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface QuotaExchangePayload {
  creditAmount: number;
}

export interface ConsumeQuotaPayload {
  model: string;
  tokensIn: number;
  tokensOut: number;
  sessionId?: string;
}

export interface ConsumeQuotaResult {
  costUsd: number;
  balanceUsd: number;
  lifetimeUsed: number;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export interface TokenUsageByModel {
  model: string;
  count: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface TokenUsageByDay {
  day: string;
  count: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface TokenUsageSummary {
  days: number;
  byModel: TokenUsageByModel[];
  byDay: TokenUsageByDay[];
}

export interface TokenModelsCatalog {
  creditsPerDollar: number;
  models: ModelPricing[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type CreditsApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
