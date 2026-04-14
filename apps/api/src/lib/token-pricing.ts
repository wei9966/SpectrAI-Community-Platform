import { CREDITS_PER_DOLLAR, MODEL_PRICING } from "../db/seed-credits.js";

export const MARKUP_MULTIPLIER = 1.0;

export function calculateCostUsd(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];

  if (!pricing) {
    throw new Error(`Unsupported model: ${model}`);
  }

  const safeTokensIn = Number.isFinite(tokensIn) ? Math.max(0, tokensIn) : 0;
  const safeTokensOut = Number.isFinite(tokensOut) ? Math.max(0, tokensOut) : 0;
  const total =
    ((safeTokensIn / 1_000_000) * pricing.inputPer1M +
      (safeTokensOut / 1_000_000) * pricing.outputPer1M) *
    MARKUP_MULTIPLIER;

  return Number(total.toFixed(6));
}

export const SUPPORTED_MODELS = Object.entries(MODEL_PRICING).map(
  ([model, pricing]) => ({
    model,
    inputPer1M: pricing.inputPer1M,
    outputPer1M: pricing.outputPer1M,
    markupMultiplier: MARKUP_MULTIPLIER,
    creditsPerDollar: CREDITS_PER_DOLLAR,
  })
);
