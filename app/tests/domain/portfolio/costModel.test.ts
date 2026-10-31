import { describe, expect, it } from 'vitest';
import { caseDiscountRate } from '@/domain/canonical';
import { makeCtx } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { pilotMonths, pilotSizing } from '@/domain/tune/program';
import { consolidate, costModel, envelopeCase, scheduledProducts, type CostModel, type Portfolio } from '@/domain/portfolio';
import { byLine, byProduct, cells, expectChecksZero, expectFormulasConsistent, nz, TOL } from '../../helpers/costModel';
import { fourProducts, openPortfolioFixture, regulatedPortfolio } from '../../helpers/portfolioFixtures';
import { FIXTURE_IDS, identical, loadCase, withProduct, withWave } from '../../helpers/portfolio';

const close = (a: number, b: number): void => { expect(Math.abs(a - b)).toBeLessThanOrEqual(TOL); };
const PILOT = 'Pilot (included in totals)';
const lineSum = (m: CostModel, name: string, i: number): number => m.other.rows.filter((r) => r.keys[4] === name && r.role === 'line').reduce((s,
  r) => s + nz(r.months[i]), 0);
/** B9b: one setup row per programme cost line ("Setup: Training", "Setup: Coaching"…) and the Knowledge Hub / KT row; together the setup series. */
const setupSum = (m: CostModel, i: number): number => m.other.rows.filter((r) => r.keys[3] === 'Setup' && r.role === 'line').reduce((s, r) => s
  + nz(r.months[i]), 0);

/** Everything a model must satisfy against the consolidation it comes from. */
function reconcile(pf: Portfolio, m: CostModel): void {
  const c = consolidate(pf), L = c.horizon, S = c.series;
  expect(m.horizon).toBe(L);
  expect(expectChecksZero(m)).toBeGreaterThan(0);
  expectFormulasConsistent(m.values); expectFormulasConsistent(m.rates); expectFormulasConsistent(m.other);
  const total = m.other.rows.filter((r) => r.role === 'total' && r.keys[4] === 'PORTFOLIO TOTAL TO-BE COST (pilot included)')[0]!;
  const team = m.rates.rows.filter((r) => r.role === 'teamcost');
  const base = c.products.reduce((s, v) => s + v.run.engine.K.baselineRunMonth, 0);
  close(nz(total.t0), base);
  expect(m.other.rows.filter((r) => r.role === 'team').reduce((s, r) => s + nz(r.t0), 0)).toBeCloseTo(base, 6);
  for (let i = 0; i < L; i++) {
    const act = c.products.reduce((s, v) => s + (i >= v.month0 && i < v.month0 + v.run.rows.length ? v.run.engine.K.baselineRunMonth : 0), 0);
    close(nz(total.months[i]), act - S.net[i]! + lineSum(m, PILOT, i));   // the engine cost plus the pilot (decision D4)
    const teamI = team.reduce((s, r) => s + nz(r.months[i]), 0);
    close(teamI + lineSum(m, 'Agentic run team (AgentOps)', i) + lineSum(m, 'Tokens', i) + lineSum(m, 'Infrastructure', i) + lineSum(m,
      'Knowledge Hub curation', i) + lineSum(m, 'Knowledge Hub infrastructure (allocated)', i), S.run[i]!);
    close(lineSum(m, 'Tokens', i), S.token[i]!); close(lineSum(m, 'Infrastructure', i), S.infra[i]!);
    close(lineSum(m, 'Knowledge Hub curation', i) + lineSum(m, 'Knowledge Hub infrastructure (allocated)', i), S.khCost[i]!);
    close(setupSum(m, i), S.setup[i]!);
    close(lineSum(m, 'Setup: Knowledge Hub and knowledge transfer (KT)', i), S.ktSetup[i]!);
    close(-lineSum(m, 'Knowledge transfer avoided', i), S.ktAvoided[i]!);
  }
  // product-level: days x applied rate (+ blending) = the engine's team cost, and t0 = the baseline run cost per month
  for (const v of c.products) {
    const days = byProduct(m.values, v.name).filter((r) => r.role === 'days'), rate = byProduct(m.rates, v.name).filter((r) => r.role === 'rate');
    expect(days.length).toBe(v.run.ctx.s.teamIn.length);
    close(days.reduce((s, r, k) => s + nz(r.t0) * nz(rate[k]!.t0), 0), v.run.engine.K.baselineRunMonth);
    v.run.rows.forEach((row, t) => {
      const i = v.month0 + t;
      if (i >= L) return;
      const dot = days.reduce((s, r, k) => s + nz(r.months[i]) * nz(rate[k]!.months[i]), 0);
      close(dot + nz(byProduct(m.rates, v.name).find((r) => r.role === 'adjust')!.months[i]), row.teamCost);
      close(days.reduce((s, r) => s + nz(r.months[i]), 0), row.humanFte * v.run.engine.K.wdMonth);
    });
    for (let i = 0; i < Math.min(v.month0, L); i++) expect(days.every((r) => r.months[i] === null)).toBe(true);
  }
  // subtotals add up, month by month
  const subs = m.values.rows.filter((r) => r.role === 'sub');
  const prodSubs = subs.filter((r) => r.keys[4] === 'Product subtotal (human days)'), grand = subs[subs.length - 1]!;
  for (let j = -1; j < L; j++) {
    const g = (r: { t0: number | null; months: (number | null)[] }) => (j < 0 ? nz(r.t0) : nz(r.months[j]));
    close(prodSubs.reduce((s, r) => s + g(r), 0), g(grand));
  }
  expect(m.annualRate).toBe(c.rate);
  const dr = m.params.find((p) => p.name === 'Annual discount rate')!;
  expect(dr.value).toBe(caseDiscountRate(makeCtx({ ...pf.common, teamIn: [] } as never)));
  expect(m.other.rows[m.other.rows.length - 1]!.months[2]).toBeCloseTo(1 / Math.pow(1 + c.rate / 12, 3), 12);
}

describe('cost model: days x rate + other costs = the app cost', () => {
  it('holds on all fixtures wrapped by envelopeCase (single product)', () => {
    expect(FIXTURE_IDS.length).toBe(107);
    const seen: Record<string, number> = { Tokens: 0, Infrastructure: 0, 'Agentic run team (AgentOps)': 0, 'Verification tax': 0, 'Knowledge Hub curation': 0,
      'Knowledge transfer avoided': 0, blend: 0, 'Setup: Tooling & infra': 0, 'Setup: Training': 0, 'Setup: Coaching': 0, 'Setup: Governance': 0 };
    for (const id of FIXTURE_IDS) {
      const pf = envelopeCase(loadCase(id)), m = costModel(pf, { kind: 'portfolio' });
      try { reconcile(pf, m); } catch (e) { throw new Error(`${id}: ${(e as Error).message}`); }
      const prod = costModel(pf, { kind: 'product', id: pf.products[0]!.id });
      expect(prod.values.rows.length).toBe(m.values.rows.length);
      expect(byProduct(m.values, 'Product 1').length).toBeGreaterThan(0);
      for (const key of Object.keys(seen)) if (m.other.rows.some((r) => r.keys[4] === key && Math.abs(r.total ?? 0) > 1)) seen[key]!++;
      if (m.rates.rows.some((r) => r.role === 'adjust' && Math.abs(r.total ?? 0) > 1)) seen.blend!++;
    }
    // the reconciliation is not vacuous: the lines that matter are really populated on many fixtures
    for (const [k, n] of Object.entries(seen)) expect(n, k).toBeGreaterThan(5);
  }, 600000);
  it('holds on the three-product portfolio, offsets, KT lead, a wave starting later and an unscheduled product', () => {
    for (const pf of [openPortfolioFixture('pf-three-products'), fourProducts(), regulatedPortfolio(),
      withWave(withProduct(identical(loadCase('golden'), 2), { id: 'late', waveId: 'w2', offset: 3 }), 'w2', 5),
      withProduct(identical(loadCase('golden'), 1), { id: 'none', waveId: null })]) {
      const m = costModel(pf, { kind: 'portfolio' });
      reconcile(pf, m);
      const planned = scheduledProducts(pf).map((s) => s.product.name);
      expect(m.excluded).toEqual(pf.products.filter((p) => !planned.includes(p.name)).map((p) => p.name));
      for (const name of m.excluded) expect(byProduct(m.values, name)).toEqual([]);
    }
  }, 300000);
  it('a wave or a product scope covers only its products and still reconciles', () => {
    const pf = fourProducts(), c = consolidate(pf), w2 = c.waves[1]!, mw = costModel(pf, { kind: 'wave', id: w2.id }),
      mp = costModel(pf, { kind: 'product', id: pf.products[1]!.id });
    expect(new Set(mw.values.rows.map((r) => r.keys[1]).filter((w) => w !== '(all waves)'))).toEqual(new Set([w2.name]));
    expect(mw.values.rows.filter((r) => r.role === 'days').length).toBe(mw.values.rows.filter((r) => r.role === 'days' && r.keys[1] === w2.name).length);
    expect(mw.scopeLabel).toBe(`Wave ${w2.name}`);
    expect(new Set(mp.values.rows.map((r) => r.keys[2]).filter((p) => p !== '(all products)'))).toEqual(new Set([pf.products[1]!.name]));
    for (const m of [mw, mp]) { expectChecksZero(m); expectFormulasConsistent(m.other); }
    expect(() => costModel(pf, { kind: 'product', id: pf.products[3]!.id })).toThrow(/not planned/);
    expect(() => costModel(pf, { kind: 'wave', id: 'nope' })).toThrow(/does not exist/);
  });
  // DEV-B9B-PILOT (D-B28): the pilot is spent in the months before the build, ending at the product's month 0 (from calendar month 1 when the
  // calendar has no earlier month), not from the product's month 1
  it('the pilot is a dated line included in the totals (D4): its months follow the pilot sizing, before the build', () => {
    const pf = fourProducts(), c = consolidate(pf), m = costModel(pf, { kind: 'portfolio' });
    for (const v of c.products) {
      const pilot = byLine(m.other, v.name, PILOT), size = pilotSizing(v.run.ctx), pm = pilotMonths(size);
      expect(pm.length).toBe(Math.ceil((size.totalWeeks * 12) / 52 - 1e-9));
      const from = Math.max(0, v.month0 - pm.length);
      pilot.months.forEach((x, i) => expect(x, `${v.name} M${i + 1}`).toBe(i >= from && i < from + pm.length ? pm[i - from] : null));
      expect(pilot.total!).toBeCloseTo(size.cost, 6);
      const total = byProduct(m.other, v.name).find((r) => r.role === 'total')!,
        lines = byProduct(m.other, v.name).filter((r) => r.role === 'line' || r.role === 'team');
      // total = sum of the rows, the pilot included
      for (let i = 0; i < m.horizon; i++) close(nz(total.months[i]), lines.reduce((s, r) => s + nz(r.months[i]), 0));
      expect(lines.some((r) => r.keys[4] === PILOT)).toBe(true);
    }
    const all = m.other.rows.find((r) => r.keys[4] === 'PORTFOLIO TOTAL TO-BE COST (pilot included)')!;
    close(all.total!, m.other.rows.filter((r) => r.role === 'total' && r.keys[2] !== '(all products)').reduce((s, r) => s + r.total!, 0));
    expect(m.params.find((p) => p.name.startsWith('Pilot cost'))!.name).toBe('Pilot cost (included in the cost-model totals, not in the engine cost)');
    for (const n of ['Annual discount rate', 'Monthly discount rate (annual rate / 12)', 'Knowledge-transfer lead', 'Knowledge Hub curation',
      'Output share of tokens (TOK_OUT_SHARE)', 'Working days per year']) expect(m.params.some((p) => p.name === n)).toBe(true);
    expect(m.params.every((p) => p.where.length > 0)).toBe(true);
    expect(cells(byLine(m.other, pf.products[0]!.name, 'Tokens')).length).toBe(m.horizon + 1);
  });
});

describe('cost model: reconciliation with the app figures (pilot included in the export only)', () => {
  it.each(['golden', 'horizon-5', 'econ-no-setup', 'ctx-msi'])('%s: AS-IS cost - TOTAL TO-BE COST over the horizon = the app net benefit - the pilot', (id) => {
    const state = loadCase(id), pf = envelopeCase(state), m = costModel(pf, { kind: 'portfolio' }), h = headline(makeCtx(state)),
      v = consolidate(pf).products[0]!;
    const total = m.other.rows.find((r) => r.keys[4] === 'PORTFOLIO TOTAL TO-BE COST (pilot included)')!,
      asis = byLine(m.other, v.name, 'AS-IS cost of the same months');
    const pilot = pilotMonths(pilotSizing(v.run.ctx)).slice(0, m.horizon).reduce((a, x) => a + x, 0);
    expect(pilot).toBeGreaterThan(0);
    // the app headline (net) does not count the pilot; the export does
    expect(Math.abs(asis.months.reduce<number>((a, x) => a + nz(x), 0) - total.total! - (h.net - pilot))).toBeLessThan(1e-4);
  });
});
