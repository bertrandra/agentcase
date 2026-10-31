import { describe, expect, it } from 'vitest';
import { setProductOwner } from '@/controllers/org';
import {
  childUnitScopes, consolidate, groupOf, pfDecision, pfStressFingerprint, portfolioMonteCarlo, selectionStress, UNASSIGNED_UNIT, unitRanking,
  type GroupScope, type PfStress,
} from '@/domain/portfolio';
import { mcStats, type McStats } from '@/domain/stress';
import type { Decision } from '@/domain/verdict';
import { unitTreeThree } from '../../helpers/unitScope';

/**
 * F-B83 / D-B40 (docs/SPEC_BPMN.md § 21, phase B10d): a full decision per unit. A unit's distribution is its products' draws of the portfolio run
 * added up draw by draw (the same per-product streams), its verdict the single-case rule on it — no unit-specific formula beyond the product set.
 */
const unit = (id: string): GroupScope => ({ kind: 'unit', id });
const OPTS = { draws: 300, seed: 11, rho: 0.35 };
/** everything of a decision but its "Scope" context line (the label differs: "Portfolio", the wave's name, the unit's name) */
const core = (d: Decision) => ({ ...d, ctx: d.ctx.filter((l) => l.k !== 'Scope') });

describe('unit = portfolio when the unit owns every product (same seed, exact)', () => {
  it('distribution, risk reduction, verdict', () => {
    const t = unitTreeThree();
    setProductOwner(t.ids[2], 'd3');   // C joins the business unit: bu now owns A, B and C
    const pf = t.pf(), run = portfolioMonteCarlo(pf, OPTS), s = selectionStress(run, unit('bu'), pf)!;
    expect(s.stats).toEqual(run.stats); expect(s.outcomes).toEqual(run.outcomes); expect(s.diversification).toEqual(run.diversification);
    expect(s.products.map((p) => p.rSel)).toEqual(run.products.map((p) => p.r));
    expect(core(pfDecision(pf, run, unit('bu'))!)).toEqual(core(pfDecision(pf, run, { kind: 'portfolio' })!));
    expect(pfDecision(pf, run, unit('bu'))!.ctx[0]).toEqual({ k: 'Scope', v: 'Retail BU · 3 products' });
  });
});

describe('unit = wave when it has the same members', () => {
  it('bu holds A and B, exactly wave 1', () => {
    const t = unitTreeThree(), pf = t.pf(), run = portfolioMonteCarlo(pf, OPTS), w1 = run.waves.find((w) => w.id === t.waves[0])!;
    const s = selectionStress(run, unit('bu'), pf)!, w = selectionStress(run, { kind: 'wave', id: t.waves[0] })!;
    expect(s.stats).toEqual(w1.stats); expect(s.outcomes).toEqual(w1.outcomes); expect(s.diversification).toEqual(w.diversification);
    expect(s.products.map((p) => p.rSel)).toEqual(w.products.map((p) => p.rWave));
    expect(core(pfDecision(pf, run, unit('bu'))!)).toEqual(core(pfDecision(pf, run, { kind: 'wave', id: t.waves[0] })!));
  });
  it('a unit of one product has that product\'s own distribution; Unassigned holds C', () => {
    const t = unitTreeThree(), pf = t.pf(), run = portfolioMonteCarlo(pf, OPTS), [a, , c] = t.ids;
    expect(selectionStress(run, unit('d2'), pf)!.stats).toEqual({ ...run.products.find((p) => p.id === a)!.stats });
    expect(selectionStress(run, unit(UNASSIGNED_UNIT), pf)!.products.map((p) => p.id)).toEqual([c]);
    expect(selectionStress(run, unit('empty'), pf)).toBeNull(); expect(pfDecision(pf, run, unit('empty'))).toBeNull();
    expect(selectionStress(run, unit('nope'), pf)).toBeNull(); expect(selectionStress(run, unit('bu'))).toBeNull();   // a unit needs the portfolio
  });
});

describe('hand-computed small Monte Carlo (10 draws, fixed values)', () => {
  it('the unit adds its products draw by draw; P10 / P50 / P90 / mean / P(net < 0) / CVaR and the risk reduction by hand', () => {
    const t = unitTreeThree(), pf = t.pf(), [a, b] = t.ids, real = portfolioMonteCarlo(pf, { draws: 10, seed: 3, rho: 0 });
    const A = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], B = [10, -20, 0, 5, 5, -5, 0, 10, -10, 0];
    const st = (d: number[]) => ({ ...mcStats(d, 3).stats, relSpread: null });
    const run: PfStress = { ...real, products: real.products.map((p) => (p.id === a ? { ...p, perDraw: A, stats: st(A) }
      : p.id === b ? { ...p, perDraw: B, stats: st(B) } : p)) };
    const s = selectionStress(run, unit('bu'), pf)!, near = (x: number, y: number) => expect(x).toBeCloseTo(y, 10);
    // sums 11 -18 3 9 10 1 7 18 -1 10 -> sorted -18 -1 1 3 7 9 10 10 11 18 (linear-interpolation quantiles, CVaR = the worst draw of 10)
    expect(s.outcomes).toEqual([-18, -1, 1, 3, 7, 9, 10, 10, 11, 18]);
    const want: Partial<McStats> = { p10: -2.7, p50: 8, p90: 11.7, mean: 5, pNetNeg: 0.2, cvar10: -18, n: 10 };
    for (const [k, v] of Object.entries(want)) near(s.stats[k as keyof McStats] as number, v as number);
    // stand-alone P10: A 1.9, B -11 -> sum -9.1; the unit's P10 -2.7: risk reduction 6.4
    near(s.diversification.sumP10, -9.1); near(s.diversification.p10, -2.7); near(s.diversification.reduction, 6.4);
    const d = pfDecision(pf, run, unit('bu'))!;
    expect(d.stats.p10).toBeCloseTo(-2.7, 10); expect(d.confidence).toBe(80);
  });
});

describe('ranking of the units and the selection is read, never drawn again', () => {
  it('top units and Unassigned at the Portfolio, sub-units at a unit; NPV from groupOf, verdict from pfDecision', () => {
    const t = unitTreeThree(), pf = t.pf(), c = consolidate(pf), run = portfolioMonteCarlo(pf, OPTS);
    expect(childUnitScopes(pf, { kind: 'portfolio' }).map((u) => u.id)).toEqual(['unit-delivery', 'bu', 'empty', UNASSIGNED_UNIT]);
    expect(childUnitScopes(pf, unit('bu')).map((u) => u.id)).toEqual(['d1', 'd3']);
    expect(childUnitScopes(pf, { kind: 'wave', id: t.waves[0] })).toEqual([]);
    const rows = unitRanking(pf, c, run, { kind: 'portfolio' });
    expect(rows.map((r) => r.id).sort()).toEqual(['bu', UNASSIGNED_UNIT].sort());   // units without a planned product are left out
    for (const r of rows) {
      expect(r.npv).toBe(groupOf(c, unit(r.id))!.summary.npv);
      const d = pfDecision(pf, run, unit(r.id))!;
      expect([r.verdict, r.confidence, r.p10]).toEqual([d.verdict, d.confidence, d.stats.p10]);
    }
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
    expect(unitRanking(pf, c, null, unit('bu')).map((r) => r.verdict)).toEqual([null, null]);
  });
  it('memoised on the run: the same selection object on a second read; an owner change re-reads the same draws and marks the run stale', () => {
    const t = unitTreeThree(), pf = t.pf(), run = portfolioMonteCarlo(pf, OPTS);
    expect(selectionStress(run, unit('bu'), pf)).toBe(selectionStress(run, unit('bu'), pf));
    setProductOwner(t.ids[2], 'd3');
    const pf2 = t.pf(), s = selectionStress(run, unit('bu'), pf2)!;
    expect(s.products).toHaveLength(3); expect(s.stats).toEqual(run.stats);   // the same run, re-read for the new members
    // the members changed: the stale rule (fingerprint of each product's case, whose document holds the organisation) asks for a new run
    expect(pfStressFingerprint(pf2)).not.toBe(run.fingerprint);
  });
});
