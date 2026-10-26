import { describe, expect, it } from 'vitest';
import { evlModel } from '@/domain/model/evidence';
import { evtModel } from '@/domain/model/evt';
import { flowModel } from '@/domain/model/flow';
import { lceModel } from '@/domain/model/lce';
import { mcsOf } from '@/domain/model/modelState';
import { supModel } from '@/domain/model/supView';
import { convergenceChecks } from '@/domain/pdc/verifConvergence';
import {
  convergenceByProduct, envelopeCase, evidenceByProduct, flowByProduct, portfolioMonteCarlo, productCtx, scheduledProducts, stochasticByProduct,
  supervisionByProduct, verificationByProduct,
  type Portfolio,
} from '@/domain/portfolio';
import type { CaseState } from '@/domain/types/state';
import { expectClose, loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const base = loadCase('golden');
const allOn: CaseState = { ...base,
  MODEL: { ...base.MODEL, FLAGS: { ...base.MODEL.FLAGS, mcs: true, lce: true, sup: true, flow: true, evl: true, evt: true } } };
const build = (c: CaseState): Portfolio => {
  let pf = withWave(withProduct(withProduct(envelopeCase(c), { id: 'B', offset: 2, teamIn: scaledTeam(c, 2) }), { id: 'D', waveId: null }), 'w2', 6);
  pf = withProduct(pf, { id: 'C', waveId: 'w2', teamIn: scaledTeam(c, 3) });
  return { ...pf, horizonMonths: pf.horizonMonths + 6 };
};
const off = build(base), on = build(allOn);
const ids = (pf: Portfolio): string[] => scheduledProducts(pf).map((s) => s.product.id);
const last = <T,>(a: T[]): T => a[a.length - 1] as T;

describe.each([['phases as shipped', off], ['every phase on', on]] as const)('model-engine aggregates — %s', (_n, pf) => {
  const sel = ids(pf);
  it('P4 stochastic: flag, settings and the product’s P50 from the portfolio run', () => {
    const run = portfolioMonteCarlo(pf, { draws: 200, seed: 5, rho: 0 }), a = stochasticByProduct(pf, sel, run), none = stochasticByProduct(pf, sel, null);
    for (const r of a.rows) {
      const c = productCtx(pf, r.id), m = mcsOf(c.s.MODEL);
      expect(r.on).toBe(!!c.s.MODEL.FLAGS.mcs); expect([r.draws, r.seed, r.rho]).toEqual([m.draws, m.seed, m.rho]);
        expectClose(r.p50 as number, run.products.find((p) => p.id === r.id)!.stats.p50);
    }
    expect(a.on).toBe(a.rows.filter((r) => r.on).length); expect(none.rows.every((r) => r.p50 === null)).toBe(true);
  });
  it('P1 convergence: the product’s lceModel and its CC-LC checks', () => {
    const a = convergenceByProduct(pf, sel);
    for (const r of a.rows) {
      const c = productCtx(pf, r.id), m = lceModel(c), lc = convergenceChecks(c).filter((k) => k.id.startsWith('CC-LC'));
      expectClose(r.weightedEN, m.weightedEN); expectClose(r.escapePct, m.escapePct); expect(r.loops).toBe(m.loops.length);
        expect([r.checksPass, r.checksFail]).toEqual([lc.filter((k) => k.pass).length, lc.filter((k) => !k.pass).length]);
    }
    expect(a.checksFail).toBe(a.rows.reduce((s, r) => s + r.checksFail, 0)); expect(a.above).toBe(a.rows.reduce((s, r) => s + r.above, 0));
  });
  it('P3 supervision: the product’s supModel at the horizon end and the roll-up line', () => {
    const a = supervisionByProduct(pf, sel);
    for (const r of a.rows) {
      const s = supModel(productCtx(pf, r.id));
      expectClose(r.needed, last(s.esupNeeded));
      expectClose(r.runCost, last(s.runCost));
      expectClose(r.vfte, last(s.vfteEff));
      expect(r.constrained).toBe(s.constrained);
    }
    expectClose(a.totals.vfte, a.rows.reduce((s, r) => s + r.vfte, 0)); expectClose(a.totals.runCost, a.rows.reduce((s, r) => s + r.runCost, 0));
      expect(a.totals.on).toBe(a.rows.filter((r) => r.on).length);
  });
  it('P5 flow: the product’s flowModel; no margin means no value', () => {
    const a = flowByProduct(pf, sel);
    for (const r of a.rows) {
      const f = flowModel(productCtx(pf, r.id));
      expectClose(r.ctNew, f.ctNew);
      expectClose(r.wip, f.wip);
      expect(r.flowNpv).toBe(f.hasMargin ? f.flowNpv : null);
    }
    expectClose(a.wip, a.rows.reduce((s, r) => s + r.wip, 0)); expect(a.valued).toBe(a.rows.filter((r) => r.flowNpv !== null).length);
  });
  it('P6 evidence: grade and tiers of the product, the roll-up has the worst grade', () => {
    const a = evidenceByProduct(pf, sel, null);
    for (const r of a.rows) {
      const e = evlModel(productCtx(pf, r.id), null, null);
      expect(r.grade).toBe(e.grade);
      expect(r.measured + r.benchmark + r.assumed).toBe(e.drivers.length);
      expect(r.stage).toBe(e.stage);
    }
    expect(a.measured + a.benchmark + a.assumed).toBe(a.rows.length * 7);
    const grades = a.rows.flatMap((r) => (r.grade ? [r.grade] : []));
    expect(a.worst).toBe(grades.length ? [...grades].sort().pop() : null);
  });
  it('P2 verification: the product’s evtModel and the lowest ceiling', () => {
    const a = verificationByProduct(pf, sel);
    for (const r of a.rows) {
      const e = evtModel(productCtx(pf, r.id));
      expectClose(r.rate, e.rate);
      expectClose(r.rhoMax, e.rhoMax);
      expect(r.classes).toBe(e.classes.length);
    }
    expectClose(a.lowestRhoMax as number, Math.min(...a.rows.map((r) => r.rhoMax)));
  });
});

describe('model-engine aggregates — a selection', () => {
  it('only the products asked for; none gives empty roll-ups', () => {
    const one = supervisionByProduct(on, [ids(on)[0]!]);
    expect(one.rows).toHaveLength(1);
    const none = supervisionByProduct(on, []);
    expect(none.rows).toEqual([]); expect(none.totals.vfte).toBe(0);
    expect(verificationByProduct(on, []).lowestRhoMax).toBeNull(); expect(evidenceByProduct(on, [], null).worst).toBeNull();
  });
  it('the phases turned on are seen as such', () => {
    expect(supervisionByProduct(on, ids(on)).totals.on).toBe(ids(on).length);
    expect(flowByProduct(on, ids(on)).on).toBe(ids(on).length);
    expect(convergenceByProduct(on, ids(on)).on).toBe(ids(on).length);
  });
});
