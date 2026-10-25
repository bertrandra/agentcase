import { beforeEach, describe, expect, it } from 'vitest';
import { setProductOverride } from '@/controllers/productOverrides';
import { setAllReadiness } from '@/controllers/tuneA';
import {
  aggEligibility, aggKnowledge, aggLifecycle, aggMaturity, aggMaturityMap, aggOpModel, aggProgram, aggReadiness, aggRisk, aggRunSizing, aggSetup, aggTokens,
  consolidate,
  corePortfolio, knowledgeTable, knowledgeTotals, resolveProduct, scheduledProducts, spreadOf, type Portfolio,
} from '@/domain/portfolio';
import { ctxOf } from '@/domain/portfolio/memo';
import { opModelView, readinessIndex, eligVerdict } from '@/domain/tune';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { tokenUsage } from '@/domain/tuneB/tokens';
import { openPortfolioFixture, pfNow } from '../../helpers/portfolioFixtures';

let pf: Portfolio, all: string[], wave1: string[], wave2: string[];
const ctxFor = (id: string) => ctxOf(resolveProduct(pf, id));
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9 * Math.max(1, Math.abs(b)));

beforeEach(() => {
  pf = corePortfolio(openPortfolioFixture('pf-three-products'));
  const planned = scheduledProducts(pf);
  all = planned.map((s) => s.product.id);
  wave1 = planned.filter((s) => s.wave.id === 'w1').map((s) => s.product.id);
  wave2 = planned.filter((s) => s.wave.id !== 'w1').map((s) => s.product.id);
  // make the products differ: Payroll (2nd) and Billing (3rd) carry their own values
  const [, b, c] = all as [string, string, string];
  setProductOverride(b, 'values.setupTooling', '50000'); setProductOverride(c, 'values.setupTooling', '5000');
  setProductOverride(b, 'values.runFloorMin', '2'); setProductOverride(b, 'values.sddMat', '60'); setProductOverride(b, 'values.pilotFte', '5');
  setProductOverride(c, 'values.aiActTier', 'high'); setProductOverride(c, 'values.elPre_plat', 'unmet'); setProductOverride(b, 'lifecyclePos', 80);
  setProductOverride(c, 'MATURITY_MAP', { rampBounds: [0, 30, 60, 85] });
  pf = corePortfolio(pfNow());
});

describe('spreadOf', () => {
  it('min, max, plain mean and count; zeros when empty', () => {
    expect(spreadOf([2, 4, 9])).toEqual({ min: 2, max: 9, avg: 5, n: 3 });
    expect(spreadOf([])).toEqual({ min: 0, max: 0, avg: 0, n: 0 });
  });
});

describe('selection: planned products only, in the order asked', () => {
  it('every aggregate returns one line per requested product, unknown ids ignored, and the Portfolio holds three planned products', () => {
    expect(all).toHaveLength(3);
    const fns = [aggMaturityMap, aggReadiness, aggLifecycle, aggTokens, aggKnowledge, aggRunSizing, aggOpModel, aggSetup, aggEligibility, aggMaturity,
      aggProgram, aggRisk];
    for (const f of fns) {
      expect(f(pf, all).rows.map((r) => r.id), f.name).toEqual(all);
      expect(f(pf, wave1).rows.map((r) => r.id), f.name).toEqual(wave1);
      expect(f(pf, [...wave2, 'nope']).rows.map((r) => r.id), f.name).toEqual(wave2);
      expect(f(pf, []).rows, f.name).toEqual([]);
    }
  });
});

describe('Portfolio and Wave: the lines are the domain figures of each product', () => {
  it('setup: lines, totals and spread', () => {
    for (const ids of [all, wave1, wave2]) {
      const a = aggSetup(pf, ids), per = ids.map((id) => setupBreakdown(ctxFor(id)).total);
      a.rows.forEach((r, i) => near(r.total, per[i]!));
      near(a.totals.total, per.reduce((x, y) => x + y, 0));
      near(a.totals.tooling, a.rows.reduce((x, r) => x + r.tooling, 0));
      near(a.spread.max, Math.max(...per));
    }
    expect(aggSetup(pf, all).rows.map((r) => r.tooling)).toContain(50000);
  });

  it('token economics: whole-horizon total equals the consolidated token series (Portfolio and each Wave)', () => {
    const c = consolidate(pf), sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    near(aggTokens(pf, all).totals.horizonCost, sum(c.series.token));
    near(aggTokens(pf, wave1).totals.horizonCost, sum(c.waves.find((w) => w.id === 'w1')!.series.token));
    near(aggTokens(pf, wave2).totals.horizonCost, sum(c.waves.find((w) => w.id !== 'w1')!.series.token));
    const a = aggTokens(pf, all);
    a.rows.forEach((r, i) => near(r.costEnd, tokenUsage(ctxFor(all[i]!)).costY3));
    expect(a.models.length).toBeGreaterThan(0);
  });

  it('knowledge: lines are the Knowledge-transfer table lines, totals are knowledgeTotals of the selection', () => {
    const kt = knowledgeTable(pf);
    for (const ids of [all, wave1, wave2]) {
      const a = aggKnowledge(pf, ids), lines = kt.rows.filter((r) => ids.includes(r.productId));
      a.rows.forEach((r, i) => { near(r.setup, lines[i]!.setup); near(r.annual, lines[i]!.annual); expect(r.targetCC).toBe(lines[i]!.targetCC); });
      const t = knowledgeTotals(lines);
      near(a.totals.setup, t.setup); near(a.totals.annual, t.annual); near(a.totals.hubDeltaSav, t.hubDeltaSav);
    }
    const own = aggKnowledge(pf, all).rows;
    expect(own.find((r) => r.name === 'Payroll')!.ownFields).toBeGreaterThan(0);
    expect(own.find((r) => r.name === 'Payroll')!.curationFTE).toBe(1);
  });

  it('operating model: totals add the products, ok + ko = the products', () => {
    for (const ids of [all, wave1, wave2]) {
      const a = aggOpModel(pf, ids), v = ids.map((id) => opModelView(ctxFor(id)));
      near(a.totals.y1.pods, v.reduce((x, o) => x + o.y1.pods, 0));
      near(a.totals.yN.total, v.reduce((x, o) => x + o.yN.total, 0));
      expect(a.totals.ok + a.totals.ko).toBe(ids.length);
      a.rows.forEach((r, i) => expect(r.ok).toBe(v[i]!.ok));
    }
  });

  it('eligibility: verdicts and their count (a product with an unmet critical prerequisite is blocked)', () => {
    const a = aggEligibility(pf, all), v = all.map((id) => eligVerdict(ctxFor(id)));
    a.rows.forEach((r, i) => { expect(r.verdict).toBe(v[i]!.verdict); expect(r.unmetCrit).toBe(v[i]!.unmetCrit); });
    expect(a.totals.noGo).toBe(1);
    expect(a.totals.go + a.totals.conditional + a.totals.noGo).toBe(3);
    expect(aggEligibility(pf, wave1).totals.noGo).toBe(0);
    expect(aggEligibility(pf, wave2).totals.noGo).toBe(1);
  });

  it('readiness: not assessed until answered; then the mean over the assessed products', () => {
    const blank = aggReadiness(pf, all);
    expect(blank.assessed).toBe(0); expect(blank.rows.every((r) => r.index == null)).toBe(true); expect(blank.band).toBe('Not assessed');
    setAllReadiness(50);
    const p2 = corePortfolio(pfNow()), a = aggReadiness(p2, all);
    expect(a.assessed).toBe(3);
    a.rows.forEach((r) => near(r.index as number,
      readinessIndex((resolveProduct(p2, r.id) as unknown as { readinessAns: Record<string, (number | null)[]> }).readinessAns) as number));
    near(a.index.avg, 50);
  });

  it('maturity map: each product keeps its own thresholds; the spread shows it', () => {
    const a = aggMaturityMap(pf, all);
    expect(a.uniform).toBe(false);
    expect(a.rows.find((r) => r.id === all[2])!.ramp).toEqual([0, 30, 60, 85]);
    expect(a.ramp[1]!.min).toBe(25); expect(a.ramp[1]!.max).toBe(30);
    expect(aggMaturityMap(pf, wave1).uniform).toBe(true);
  });

  it('lifecycle, run sizing, maturity, program, risk: key inputs per product with spread', () => {
    const l = aggLifecycle(pf, all);
    expect(l.rows[1]!.pos).toBe(80); expect(l.pos.max).toBe(80); expect(l.statuses.length).toBe(l.postures.length);
    const r = aggRunSizing(pf, all);
    expect(r.rows[1]!.floorMin).toBe(2); expect(r.floorMin.max).toBe(2);
    near(r.totals.runFte, r.rows.reduce((x, o) => x + o.runFte, 0));
    const m = aggMaturity(pf, all);
    expect(m.rows[1]!.sdd).toBe(60); expect(m.sdd.max).toBe(60);
    const p = aggProgram(pf, all);
    expect(p.rows[1]!.pilotFte).toBe(5);
    near(p.totals.pilotCost, p.rows.reduce((x, o) => x + o.pilotCost, 0));
    const k = aggRisk(pf, all);
    expect(k.rows[2]!.tier).toBe('high'); expect(k.counts.highTier).toBe(1);
  });
});
