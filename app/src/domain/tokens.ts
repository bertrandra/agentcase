/** @calc-zone run-setup-taxes */
import type { CaseState } from './types/state';

export const tokMixTotal = (s: CaseState): number => s.TOKEN_MODELS.reduce((t, m) => t + (m.mix || 0), 0);

/** Blended price per 1M tokens across the model mix. `tokenScale` is the Monte-Carlo multiplier (null outside MC). */
export function blendedTokenCostPer1M(s: CaseState, tokenScale: number | null = null): number {
  const tot = tokMixTotal(s);
  if (!tot) return 0;
  const outS = s.TOK_OUT_SHARE / 100, inS = 1 - outS;
  let acc = 0;
  s.TOKEN_MODELS.forEach((m) => { acc += (m.mix || 0) * (inS * (m.priceIn || 0) + outS * (m.priceOut || 0)); });
  const base = acc / tot;
  return tokenScale != null ? base * tokenScale : base;
}
