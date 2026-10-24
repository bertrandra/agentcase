/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import { aiQualityTaxFactor } from '../model/vtax';
import { AIACT_TIERS, aiActKey, aiActBar, qualBar, riskBar, riskScore, wave2RiskPremium } from '../tuneB/risk';

/** The AI-Act / quality / risk-register bars live in tuneB/risk (single owner); the verdict re-exports them. */
export { AIACT_TIERS, aiActKey, aiActBar, qualBar, riskBar, wave2RiskPremium };
/** Consolidated register score 0..1 (same figure as tuneB riskScore). */
export const riskScoreRaw = riskScore;

/** Context lines these modules add to the decision read-out. */
export function wave2DecisionNotes(c: Ctx): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [], k = aiActKey(c), t = AIACT_TIERS[k] as { label: string; bar: number };
  if (k !== 'none' && k !== 'minimal') out.push({ k: 'AI-Act tier', v: t.label + (c.inp.c('aiActApply') ? ` (+${Math.round(t.bar * 100)} pts)` : '') });
  if (c.inp.c('qualApply')) out.push({ k: 'AI code-quality risk', v: `+${Math.round(qualBar(c) * 100)} pts · tax ×${aiQualityTaxFactor(c).toFixed(2)}` });
  if (c.inp.c('riskApply')) out.push({ k: 'Agentic risk register', v: `${Math.round(riskScore(c) * 100)}/100 (+${Math.round(riskBar(c) * 100)} pts)` });
  return out;
}
