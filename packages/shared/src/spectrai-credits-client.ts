/**
 * SpectrAI has a dual-credit model: community credits are the primary points balance,
 * while token quota is a USD-denominated pool exchanged from credits for model usage.
 */
import type {
  ConsumeQuotaPayload,
  CreditBalance,
  CreditSummary,
  CreditTransaction,
  CreditTransactionsPage,
  CreditsApiResponse,
  ModelPricing,
  PlanStatus,
  QuotaExchangePayload,
  TokenModelsCatalog,
  TokenQuota,
  TokenUsageSummary,
} from './types/credits-sdk';

export interface ClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  appVersion?: string;
  platform?: string;
}

export class SpectrAIApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'SpectrAIApiError';
  }
}

interface TransactionListApiData {
  items: Array<CreditTransaction & { refId?: string | null; refType?: string | null; note?: string | null }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PlanStatusApiData {
  plan: string;
  source: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export class SpectrAICreditClient {
  private readonly baseUrl: string;

  constructor(private readonly config: ClientConfig) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl);
  }

  async getBalance(): Promise<CreditBalance> {
    return this.request<CreditBalance>('/api/credits/balance');
  }

  async getTransactions(page = 1, limit = 20): Promise<CreditTransactionsPage> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const data = await this.request<TransactionListApiData>(`/api/credits/transactions?${params.toString()}`);

    return {
      items: data.items.map((item) => this.normalizeTransaction(item)),
      total: data.pagination.total,
      page: data.pagination.page,
      limit: data.pagination.limit,
    };
  }

  async getSummary(): Promise<CreditSummary> {
    return this.request<CreditSummary>('/api/credits/transactions/summary');
  }

  async getQuota(): Promise<TokenQuota> {
    return this.request<TokenQuota>('/api/spectrAI/quota');
  }

  async exchangeQuota(creditAmount: number): Promise<TokenQuota> {
    const payload: QuotaExchangePayload = { creditAmount };
    const data = await this.request<TokenQuota & { exchangedCredits?: number }>(
      '/api/spectrAI/quota/exchange',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return {
      balanceUsd: data.balanceUsd,
      lifetimeUsed: data.lifetimeUsed,
      creditsPerDollar: data.creditsPerDollar,
    };
  }

  async consumeQuota(
    model: string,
    tokensIn: number,
    tokensOut: number,
    sessionId?: string
  ): Promise<void> {
    const payload: ConsumeQuotaPayload = {
      model,
      tokensIn,
      tokensOut,
      sessionId,
    };

    await this.request('/api/spectrAI/quota/consume', {
      method: 'POST',
      body: JSON.stringify({
        model: payload.model,
        tokens_in: payload.tokensIn,
        tokens_out: payload.tokensOut,
        session_id: payload.sessionId,
      }),
    });
  }

  async getUsage(days = 30): Promise<TokenUsageSummary> {
    const params = new URLSearchParams({ days: String(days) });
    return this.request<TokenUsageSummary>(`/api/spectrAI/quota/usage?${params.toString()}`);
  }

  async getModels(): Promise<ModelPricing[]> {
    const data = await this.request<TokenModelsCatalog>('/api/spectrAI/quota/models');
    return data.models;
  }

  async getPlanStatus(): Promise<PlanStatus> {
    const data = await this.request<PlanStatusApiData>('/api/spectrAI/plan/status');

    return {
      plan: data.plan,
      source: data.source ?? '',
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      isActive: data.isActive,
    };
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  }

  private normalizeTransaction(
    item: CreditTransaction & { refId?: string | null; refType?: string | null; note?: string | null }
  ): CreditTransaction {
    return {
      id: item.id,
      type: item.type,
      amount: item.amount,
      action: item.action,
      ...(item.refId ? { refId: item.refId } : {}),
      ...(item.refType ? { refType: item.refType } : {}),
      ...(item.note ? { note: item.note } : {}),
      createdAt: item.createdAt,
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.requestOnce<T>(path, init);
      } catch (error) {
        if (error instanceof SpectrAIApiError) {
          throw error;
        }

        lastError = error;
      }
    }

    const message = lastError instanceof Error ? lastError.message : 'Network error';
    throw new SpectrAIApiError(message, 0);
  }

  private async requestOnce<T>(path: string, init: RequestInit): Promise<T> {
    const token = await this.config.getToken();
    const headers = new Headers(init.headers);

    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (this.config.appVersion) {
      headers.set('X-App-Version', this.config.appVersion);
    }

    if (this.config.platform) {
      headers.set('X-App-Platform', this.config.platform);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const payload = await this.parsePayload(response) as CreditsApiResponse<T> | null;

    if (!response.ok || (payload && 'success' in payload && payload.success === false)) {
      throw this.toApiError(response, payload);
    }

    if (!payload || !('success' in payload) || payload.success !== true) {
      throw new SpectrAIApiError('Invalid API response', response.status || 500);
    }

    return payload.data;
  }

  private async parsePayload(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private toApiError(response: Response, payload: CreditsApiResponse<unknown> | null): SpectrAIApiError {
    if (payload && 'success' in payload && payload.success === false) {
      return new SpectrAIApiError(
        payload.error || response.statusText || 'Request failed',
        response.status,
        payload.code
      );
    }

    return new SpectrAIApiError(response.statusText || 'Request failed', response.status);
  }
}
