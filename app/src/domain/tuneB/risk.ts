/** @calc-zone run-setup-taxes */
import { QUAL_ANCHOR } from '../catalog';
import type { Ctx } from '../ctx';
import { aiQualityTaxFactor, qualPremium, sddMaturity } from '../model/vtax';

/** EU AI-Act tiers: DI-bar contribution (fraction) and obligations text (legacy AIACT_TIERS). */
export const AIACT_TIERS: Record<string, { label: string; bar: number; obligations: string[] }> = {
  none: { label: 'Not classified', bar: 0, obligations: ['Classify the delivered product per mission before commitment.'] },
  minimal: { label: 'Minimal risk', bar: 0, obligations: ['Voluntary codes of conduct; no mandatory obligation.'] },
  limited: { label: 'Limited risk (transparency)', bar: 0.03, obligations: ['Transparency: disclose AI interaction and AI-generated content.'] },
  high: { label: 'High risk (Annex III)', bar: 0.1, obligations: ['Risk management system, data governance, technical documentation, logging, human oversight, accuracy/robustness/cybersecurity, conformity assessment, EU database registration.'] },
  unacceptable: { label: 'Unacceptable (prohibited)', bar: 0.3, obligations: ['Prohibited practice — the delivered use case cannot proceed as specified; redesign or decline.'] },
};

/** Agentic risk register: id, label, default probability and impact (1-3), evidence, mitigation (legacy RISK_REGISTER). */
export interface RiskDef { id: string; label: string; p: number; i: number; evidence: string; mitigation: string }
export const RISK_REGISTER: RiskDef[] = [
  { id: 'inject', label: 'Prompt / indirect injection', p: 3, i: 3, evidence: '~73% of deployments assessed vulnerable', mitigation: 'Input/output guardrails, content provenance, allow-listed tools, human-in-the-lead on privileged actions' },
  { id: 'supply', label: 'MCP / skills supply chain', p: 2, i: 3, evidence: '492 MCP servers found exposed without auth; 1184 malicious skills catalogued', mitigation: 'Pinned & signed skills, vetted MCP registry, least-privilege scopes, egress control' },
  { id: 'secret', label: 'Secret / credential theft', p: 2, i: 3, evidence: 'Agents with broad tool access exfiltrate tokens', mitigation: 'Scoped short-lived creds, no secrets in context, secret scanning in hooks' },
  { id: 'vendor', label: 'Model / vendor dependency', p: 2, i: 2, evidence: 'Lock-in, price & policy volatility, export controls', mitigation: 'Abstraction layer, multi-model routing, sovereign fallback (SovBox)' },
  { id: 'halluc', label: 'Hallucination / false success', p: 3, i: 2, evidence: 'Agents game the green (deleted tests, disabled lint)', mitigation: 'Anti-false-success guardrails, mutation testing, independent QA agent, C2 gate' },
  { id: 'debt', label: 'Knowledge debt', p: 2, i: 3, evidence: 'Supervising without practising erodes deep understanding', mitigation: 'Preceptorship 3:1–5:1, review-first, explain-the-code gates (see HRI)' },
  { id: 'pilot', label: 'Pilot never reaches production', p: 2, i: 2, evidence: '~88% of pilots never industrialised', mitigation: 'Pilot-as-product, distribution & governance from day one, break-in sprints' },
  { id: 'cancel', label: 'Scale-stage cancellation', p: 2, i: 3, evidence: 'Gartner: ~40% agentic projects cancelled by 2027', mitigation: 'Measure-before-commit (T0/T1/T2), gated Decide & Scale, value tracking' },
];

export const aiActKey = (c: Ctx): string => { const v = c.inp.v('aiActTier') || 'none'; return AIACT_TIERS[v] ? v : 'none'; };
export const aiActBar = (c: Ctx): number => (c.inp.c('aiActApply') ? (AIACT_TIERS[aiActKey(c)] as { bar: number }).bar : 0);

const riskState = (c: Ctx, which: 'p' | 'i', id: string): number => parseInt(c.inp.v(`risk_${which}_${id}`), 10);
export const riskProb = (c: Ctx, r: RiskDef): number => riskState(c, 'p', r.id) || r.p;
export const riskImpact = (c: Ctx, r: RiskDef): number => riskState(c, 'i', r.id) || r.i;
/** Consolidated risk score 0..1 (mean of probability × impact / 9). */
export const riskScore = (c: Ctx): number => RISK_REGISTER.reduce((s, r) => s + (riskProb(c, r) * riskImpact(c, r)) / 9, 0) / RISK_REGISTER.length;
export const riskBar = (c: Ctx): number => (c.inp.c('riskApply') ? Math.min(0.15, riskScore(c) * 0.15) : 0);

export function qualKey(c: Ctx): string { const v = c.inp.v('qualSeverity') || 'correctness'; return QUAL_ANCHOR[v] ? v : 'correctness'; }
/** DI-bar contribution of the AI code-quality premium, bounded by qualBarCap. */
export const qualBar = (c: Ctx): number => Math.min(c.s.COEF.qualBarCap as number, qualPremium(c) * (c.s.COEF.qualBarFactor as number));
/** Wave-2 premium on the Decision Intelligence bar. */
export const wave2RiskPremium = (c: Ctx): number => aiActBar(c) + qualBar(c) + riskBar(c);

export function qualityView(c: Ctx) {
  const a = QUAL_ANCHOR[qualKey(c)] as { m: number; l: string };
  return { anchor: a, sdd: sddMaturity(c), premium: qualPremium(c), factor: aiQualityTaxFactor(c), bar: qualBar(c), applied: c.inp.c('qualApply') };
}
export type RiskBand = { color: string; label: string };
export const riskBand = (score: number): RiskBand => (score >= 0.55 ? { color: '#8F3237', label: 'High' } : score >= 0.35 ? { color: '#b04600', label: 'Moderate' } : { color: '#006e79', label: 'Contained' });
