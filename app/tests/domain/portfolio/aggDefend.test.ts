import { describe, expect, it } from 'vitest';
import { assumptionRegister, benchmarkBase } from '@/domain/pdc/assumptions';
import { ceilingCoverage, ddBase, ddRows, isDone } from '@/domain/pdc/dd';
import { calcChain } from '@/domain/pdc/verifChain';
import { verifChecks } from '@/domain/pdc/verifChecks';
import { convergenceChecks } from '@/domain/pdc/verifConvergence';
import { directionalSensitivity } from '@/domain/pdc/verifSensi';
import { assumptionsByProduct, dueDiligenceByProduct, envelopeCase, productCtx, scheduledProducts, verifByProduct, type Portfolio } from '@/domain/portfolio';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const golden = loadCase('golden');
function four(): Portfolio {
  let pf = withWave(withProduct(withProduct(envelopeCase(golden), { id: 'B', offset: 2, teamIn: scaledTeam(golden, 2) }), { id: 'D', waveId: null }), 'w2', 6);
  pf = withProduct(pf, { id: 'C', waveId: 'w2', teamIn: scaledTeam(golden, 3) });
  return { ...pf, horizonMonths: pf.horizonMonths + 6 };
}
const pf = four(), ids = scheduledProducts(pf).map((s) => s.product.id), base = benchmarkBase(defaultDoc), dd = ddBase(defaultDoc);

describe('assumptionsByProduct', () => {
  it('counts of the product’s own register; the roll-up adds them', () => {
    const a = assumptionsByProduct(pf, ids, base);
    for (const r of a.rows) {
      const g = assumptionRegister(productCtx(pf, r.id), base, {});
      expect([r.inputs, r.atDefault, r.adjusted, r.validated, r.state]).toEqual([g.inputs.length, g.nDefault, g.nAdjusted, g.nValidated, g.state.length]);
      expect(r.atDefault + r.adjusted + r.validated).toBe(r.inputs);
    }
    for (const k of ['inputs', 'atDefault', 'adjusted', 'validated', 'overrides'] as const) expect(a.totals[k]).toBe(a.rows.reduce((s, r) => s + r[k], 0));
  });
  it('the validation by the client is common: every product counts it', () => {
    const v = { ...pf, common: { ...pf.common, assumptValidated: { horizon: true, autoPotential: true } } } as Portfolio;
    const before = assumptionsByProduct(pf, ids, base), after = assumptionsByProduct(v, ids, base);
    expect(before.totals.validated).toBe(0);
    for (const r of after.rows) expect(r.validated).toBe(2);
  });
});

describe('verifByProduct', () => {
  it('checks, convergence rows, anomalies and the ROI row of the chain are the product’s', () => {
    const a = verifByProduct(pf, ids);
    for (const r of a.rows) {
      const c = productCtx(pf, r.id), v = verifChecks(c), cv = convergenceChecks(c);
      expect([r.checks, r.checksFail]).toEqual([v.length, v.filter((x) => !x.ok).length]);
        expect([r.conv, r.convFail]).toEqual([cv.length, cv.filter((x) => !x.pass).length]);
      expect(r.failing).toEqual(cv.filter((x) => !x.pass).map((x) => x.id));
        expect(r.sensiAbnormal).toBe(directionalSensitivity(c).filter((s) => s.ok === false).length);
      expect(r.roi).toBe(calcChain(c).find((x) => x[0]!.startsWith('ROI'))![3]); expect(r.status).toBe(r.checksFail + r.convFail === 0 ? 'PASS' : 'FAIL');
    }
    expect(a.rows[0]!.conv).toBe(67);
    expect(a.totals.convFail).toBe(a.rows.reduce((s, r) => s + r.convFail, 0));
    expect(a.totals.status).toBe(a.rows.every((r) => r.status === 'PASS') ? 'PASS' : 'FAIL');
  });
});

describe('dueDiligenceByProduct', () => {
  it('coverage of the product’s register; the roll-up adds the items', () => {
    const a = dueDiligenceByProduct(pf, ids, dd);
    for (const r of a.rows) {
      const c = productCtx(pf, r.id), rows = ddRows(c, dd, {});
      expect(r.items).toBe(rows.length); expect(r.confirmed).toBe(rows.filter((x) => isDone(c, x)).length); expect(r.open).toBe(r.items - r.confirmed);
        expect(r.ceilCover).toBe(ceilingCoverage(c, rows));
      expect(r.groups.map((g) => g.group)).toEqual([...new Set(rows.map((x) => x.g))]);
        expect(r.groups.map((g) => g.items)).toEqual(r.groups.map((g) => rows.filter((x) => x.g === g.group).length));
      expect(r.invisible).toBe(rows.filter((x) => x.id.startsWith('cf-') && x.edit === 'NONE').length);
    }
    expect(a.totals.items).toBe(a.rows.reduce((s, r) => s + r.items, 0)); expect(a.totals.confirmed + a.totals.open).toBe(a.totals.items);
    expect(a.totals.pct).toBe(Math.round((a.totals.confirmed / a.totals.items) * 100));
  });
  it('an empty selection has empty roll-ups', () => {
    expect(dueDiligenceByProduct(pf, [], dd).totals).toEqual({ items: 0, confirmed: 0, open: 0, pct: 0, invisible: 0 });
  });
});
