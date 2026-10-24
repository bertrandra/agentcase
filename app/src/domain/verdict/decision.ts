/** @calc-zone verdict @owner decision-verdict */
import type { Ctx } from '../ctx';
import { engagementCoef } from '../engagement';
import { model } from '../model/overlay';
import { PNEG_BRICK } from '../stress/pNeg';
import type { McResult, McSens, McStats } from '../stress/simulate';
import { decisionContext, type CtxLine } from './context';
import { wave2RiskPremium } from './risk';
import { tok } from '../theme';

/** Decision thresholds (editable consulting benchmarks). */
export const DI_THRESHOLDS = { strongPPos: 0.8, condPPos: 0.6, maxPNegForStrong: PNEG_BRICK, p10SetupMult: 0.5 };
export type Verdict = 'strong' | 'conditional' | 'defer';

export interface Decision {
  verdict: Verdict; confidence: number; stats: McStats; p10Floor: number; drivers: McSens[]; conditions: string[]; ctx: CtxLine[]; setup: number; premium: number;
}

/** The premium on the bars from the engagement context and the wave-2 risk modules (points / 100) of one case. */
export const riskPremiumOf = (c: Ctx): number => (engagementCoef(c).riskPremium || 0) / 100 + wave2RiskPremium(c);

/**
 * THE decision rule, on figures only (shared by a product and by a portfolio / wave): "strong" needs P(net>0) above the raised strong bar AND
 * a P10 above -50 % of the setup; "conditional" from the raised conditional bar; coherence invariant: never "strong" above PNEG_BRICK.
 */
export function verdictRule(s: McStats, setup: number, premium: number): { verdict: Verdict; pPos: number; p10Floor: number } {
  const pPos = 1 - s.pNetNeg, p10Floor = -DI_THRESHOLDS.p10SetupMult * setup;
  const strongBar = Math.min(0.95, DI_THRESHOLDS.strongPPos + premium), condBar = Math.min(0.9, DI_THRESHOLDS.condPPos + premium);
  let verdict: Verdict = pPos >= strongBar && s.p10 > p10Floor ? 'strong' : pPos >= condBar ? 'conditional' : 'defer';
  if (s.pNetNeg > DI_THRESHOLDS.maxPNegForStrong && verdict === 'strong') verdict = 'conditional';
  return { verdict, pPos, p10Floor };
}

/**
 * One verdict from the Monte Carlo distribution (never from a point estimate). The bars rise with the engagement-context and
 * wave-2 risk premiums. Coherence invariant: "strong" is impossible when P(net<0) exceeds 20 %.
 */
export function decide(c: Ctx, run: Pick<McResult, 'stats' | 'sens'>): Decision {
  const s = run.stats, setup = model(c).setupTotal, premium = riskPremiumOf(c), { verdict, pPos, p10Floor } = verdictRule(s, setup, premium);
  const drivers = run.sens.slice(0, 2).filter((x) => Math.abs(x.r) >= 0.2);
  const conditions = drivers.map((x) => {
    const cur = parseFloat(c.inp.v(x.id)), dir = x.r > 0 ? 'holds at or above' : 'stays at or below';
    return `${x.label.replace(/ \(.*\)$/, '')} ${dir} ~${isNaN(cur) ? 'current' : Math.round(cur)} (sensitivity r=${x.r > 0 ? '+' : ''}${x.r})`;
  });
  return { verdict, confidence: Math.round(pPos * 100), stats: s, p10Floor, drivers, conditions, ctx: decisionContext(c), setup, premium };
}

/** Display metadata of each verdict. */
export const VERDICT_META: Record<Verdict, { color: string; bg: string; icon: string; label: string; sub: string; short: string }> = {
  strong: { get color() { return tok('teal-700'); }, get bg() { return tok('success-50'); }, icon: '✅', label: 'RECOMMENDED', short: 'RECOMMENDED', sub: 'High confidence, contained downside' },
  conditional: { get color() { return tok('warning-600'); }, get bg() { return tok('warning-55'); }, icon: '⚠️', label: 'CONDITIONALLY VIABLE', short: 'CONDITIONALLY VIABLE', sub: 'Proceed only if the conditions below hold' },
  defer: { get color() { return tok('danger-800'); }, get bg() { return tok('danger-75'); }, icon: '⛔', label: 'DEFER — DE-RISK FIRST', short: 'DEFER — DE-RISK FIRST', sub: 'Confidence too low to commit' },
};
