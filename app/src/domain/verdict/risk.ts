import type { Ctx } from '../ctx';
import { qualPremium, aiQualityTaxFactor } from '../model/vtax';

/** EU AI-Act tiers: label and contribution to the decision bar (EV-25). */
export const AIACT_TIERS: Record<string, { label: string; bar: number }> = {
  none: { label: 'Not classified', bar: 0 }, minimal: { label: 'Minimal risk', bar: 0 }, limited: { label: 'Limited risk (transparency)', bar: 0.03 },
  high: { label: 'High risk (Annex III)', bar: 0.1 }, unacceptable: { label: 'Unacceptable (prohibited)', bar: 0.3 },
};
/** Agentic risk register: id, default probability and impact on a 1-3 scale (EV-17). */
const RISK_REGISTER: [string, number, number][] = [['inject', 3, 3], ['supply', 2, 3], ['secret', 2, 3], ['vendor', 2, 2], ['halluc', 3, 2], ['debt', 2, 3], ['pilot', 2, 2], ['cancel', 2, 3]];

export function aiActKey(c: Ctx): string { const v = c.inp.v('aiActTier') || 'none'; return AIACT_TIERS[v] ? v : 'none'; }
export const aiActBar = (c: Ctx): number => (c.inp.c('aiActApply') ? (AIACT_TIERS[aiActKey(c)] as { bar: number }).bar : 0);
export const qualBar = (c: Ctx): number => Math.min(c.s.COEF.qualBarCap as number, qualPremium(c) * (c.s.COEF.qualBarFactor as number));

/** Consolidated register score 0..1 (mean of probability × impact / 9). */
export function riskScoreRaw(c: Ctx): number {
  const st = (id: string, w: 'p' | 'i') => parseInt(c.inp.v(`risk_${w}_${id}`), 10);
  return RISK_REGISTER.reduce((sum, [id, p, i]) => sum + ((st(id, 'p') || p) * (st(id, 'i') || i)) / 9, 0) / RISK_REGISTER.length;
}
export const riskBar = (c: Ctx): number => (c.inp.c('riskApply') ? Math.min(0.15, riskScoreRaw(c) * 0.15) : 0);

/** Extra confidence the verdict demands from the AI-Act tier, code-quality risk and agentic risk register. */
export const wave2RiskPremium = (c: Ctx): number => aiActBar(c) + qualBar(c) + riskBar(c);

/** Context lines these modules add to the decision read-out. */
export function wave2DecisionNotes(c: Ctx): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [], k = aiActKey(c), t = AIACT_TIERS[k] as { label: string; bar: number };
  if (k !== 'none' && k !== 'minimal') out.push({ k: 'AI-Act tier', v: t.label + (c.inp.c('aiActApply') ? ` (+${Math.round(t.bar * 100)} pts)` : '') });
  if (c.inp.c('qualApply')) out.push({ k: 'AI code-quality risk', v: `+${Math.round(qualBar(c) * 100)} pts · tax ×${aiQualityTaxFactor(c).toFixed(2)}` });
  if (c.inp.c('riskApply')) out.push({ k: 'Agentic risk register', v: `${Math.round(riskScoreRaw(c) * 100)}/100 (+${Math.round(riskBar(c) * 100)} pts)` });
  return out;
}
