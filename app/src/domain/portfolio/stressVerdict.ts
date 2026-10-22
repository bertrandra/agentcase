import { model } from '../model/overlay';
import type { McSens, McStats } from '../stress';
import { DI_THRESHOLDS, riskPremiumOf, verdictRule, type CtxLine, type Decision } from '../verdict';
import { resolveProduct } from './resolve';
import { runOf, type ProductRun } from './run';
import type { PfStress, ProductStress } from './stressTypes';
import type { Portfolio } from './types';

/** Which group of planned products a verdict speaks for: all of them, or one wave. */
export type VerdictGroup = { kind: 'portfolio' } | { kind: 'wave'; id: string };

const wavg = (runs: ProductRun[], f: (r: ProductRun) => number): number => {
  const w = runs.reduce((a, r) => a + r.baseEtp, 0);
  return w > 0 ? runs.reduce((a, r) => a + r.baseEtp * f(r), 0) / w : runs.length ? runs.reduce((a, r) => a + f(r), 0) / runs.length : 0;
};

/**
 * The decision of a group of products: the single-case rule (`verdictRule`, thresholds `DI_THRESHOLDS`) applied to the group's net-benefit
 * distribution. Only the inputs are extended: the setup is the sum of the products' setup (the floor is -50 % of it) and the premium on the
 * bars is the product premiums (engagement context + wave-2 risk modules) averaged with the entry headcount as weight. The conditions name the
 * products that carry the group's risk (|r| >= 0.2 with the group outcome) instead of single-case input drivers.
 */
export function groupDecision(stats: McStats, runs: ProductRun[], contrib: ProductStress[], pick: (p: ProductStress) => number, extra: CtxLine[]): Decision {
  const setup = runs.reduce((a, r) => a + model(r.ctx).setupTotal, 0), premium = wavg(runs, (r) => riskPremiumOf(r.ctx));
  const { verdict, pPos, p10Floor } = verdictRule(stats, setup, premium);
  const drivers: McSens[] = contrib.map((p) => ({ id: p.id, label: p.name, r: pick(p) })).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const conditions = drivers.slice(0, 2).filter((x) => Math.abs(x.r) >= 0.2).map((x) => `${x.label} delivers its net benefit: it carries the group's risk (correlation r=${x.r > 0 ? '+' : ''}${x.r} with the group outcome)`);
  const ctx: CtxLine[] = [...extra, { k: 'Risk bar premium', v: `+${Math.round(premium * 100)} pts (product premiums weighted by entry headcount)` },
    { k: 'Setup', v: `${Math.round(setup).toLocaleString('en-US')} (sum of the products, floor on P10: -${Math.round(DI_THRESHOLDS.p10SetupMult * 100)}%)` }];
  return { verdict, confidence: Math.round(pPos * 100), stats, p10Floor, drivers: drivers.slice(0, 2).filter((x) => Math.abs(x.r) >= 0.2), conditions, ctx, setup, premium };
}

/** Verdict of the whole portfolio or of one wave from a portfolio stress run; null when the wave has no planned product in the run. */
export function pfDecision(pf: Portfolio, run: PfStress, group: VerdictGroup): Decision | null {
  const mine = group.kind === 'portfolio' ? run.products : run.products.filter((p) => p.waveId === group.id);
  const wave = group.kind === 'wave' ? run.waves.find((w) => w.id === group.id) : undefined, stats = group.kind === 'portfolio' ? run.stats : wave?.stats;
  if (!stats || !mine.length) return null;
  const label = group.kind === 'portfolio' ? 'Portfolio' : (wave as { name: string }).name;
  const extra: CtxLine[] = [{ k: 'Scope', v: `${label} · ${mine.length} product${mine.length > 1 ? 's' : ''}` }, { k: 'Correlation between products (rho)', v: String(run.rho) }];
  return groupDecision(stats, mine.map((p) => runOf(resolveProduct(pf, p.id))), mine, (p) => (group.kind === 'portfolio' ? p.r : p.rWave), extra);
}
