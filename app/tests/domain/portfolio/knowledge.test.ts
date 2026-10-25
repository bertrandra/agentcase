import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeCase, makeCtx } from '@/domain';
import { khRunAnnual, khSetupCost, ktAvoidedAnnual } from '@/domain/knowledge';
import { modelRaw } from '@/domain/model/raw';
import { hubView } from '@/domain/tuneB/hub';
import {
  allocateCents, allocateInfra, consolidate, envelopeCase, knowledgeRow, knowledgeTable, resolveProduct, runOf, runStats, subsetKeys, type Portfolio,
} from '@/domain/portfolio';
import { expectClose, FIXTURE_IDS, loadCase, scaledTeam, withProduct } from '../../helpers/portfolio';

describe('A11: an inherited subset gives today\'s hub figures', () => {
  it.each(FIXTURE_IDS)('%s', (id) => {
    const c = loadCase(id), ctx = makeCtx(c), m = modelRaw(ctx), hv = hubView(ctx), row = knowledgeRow(envelopeCase(c), 'p1');
    expect(row.usesHub).toBe(hv.on);
    expectClose(row.setup, khSetupCost(ctx)); expectClose(row.setup, hv.on ? m.conv.khSetup : 0);
    expectClose(row.annual, khRunAnnual(ctx, m.tgtTJM, m.wd));
    expect([row.asisCC, row.targetCC, row.capped, row.locked]).toEqual([hv.asisCC, hv.target, hv.clamped, hv.locked]);
    expectClose(row.mult, hv.on ? hv.mult : 1);
    expectClose(row.ktAvoided, hv.kt); expectClose(row.hubDeltaSav, hv.dSav);
    if (hv.on) expectClose(row.ktDays * m.tgtTJM, ktAvoidedAnnual(ctx, m.base.etp, m.tgtTJM, hv.target));
  });

  it('a hub-enabled fixture really exercises the hub', () => {
    const row = knowledgeRow(envelopeCase(loadCase('golden')), 'p1');
    expect([row.usesHub, row.setup > 0, row.annual > 0, row.ktDays > 0]).toEqual([true, true, true, true]);
  });

  const three = (): Portfolio => withProduct(withProduct(envelopeCase(loadCase('golden')), { id: 'B', teamIn: scaledTeam(loadCase('golden'), 2) }),
    { id: 'C' });

  it('editing the subset of one product leaves the others bit-identical and recomputes only that product', () => {
    const pf = three(), before = consolidate(pf), builds = runStats.builds;
    const next = { ...pf,
      products: pf.products.map((p) => (p.id === 'B' ? { ...p, knowledge: { targetCC: 1, maturityAnswers: [4, 4, 4, 4, 4, 4, 4, 4, 4], curationFTE: 1.5,
        setupBase: 50000 } } : p)) };
    const after = consolidate(next);
    expect(runStats.builds - builds).toBe(1);
    for (const id of ['p1', 'C']) {
      const a = before.products.find((v) => v.id === id)!, b = after.products.find((v) => v.id === id)!;
      expect(b.run).toBe(a.run); expect(b.series).toBe(a.series);
      expect(resolveProduct(next, id)).toBe(resolveProduct(pf, id));
    }
    const rb = knowledgeRow(next, 'B'), r0 = knowledgeRow(pf, 'B');
    expect(rb.targetCC).toBe(1); expect(rb.asisCC).toBe(4); expect(rb.setup).not.toBe(r0.setup);
    expect(knowledgeRow(next, 'C')).toEqual(knowledgeRow(pf, 'C'));
  });

  it('a subset writes the existing case keys, so the engine is unchanged (same figures as setting the form fields)', () => {
    const c = loadCase('golden'), sub = { enabled: true, maturityAnswers: [1, 1, 1, 2, 2, 2, 3, 3, 3], targetCC: 2, curationFTE: 0.8, setupBase: 90000 };
    const pf = envelopeCase(c), viaSubset = { ...pf, products: [{ ...pf.products[0]!, knowledge: sub }] };
    const keys = subsetKeys(sub), manual = { ...c, dom: { values: { ...c.dom.values, ...keys.values }, checked: { ...c.dom.checked, ...keys.checked } } };
    expect(resolveProduct(viaSubset, 'p1')).toEqual(manual);
    expectClose(computeCase(resolveProduct(viaSubset, 'p1')).headline.npv, computeCase(manual).headline.npv);
    expect(keys.values.khA8).toBe('3'); expect(keys.values.khTargetCC).toBe('2'); expect(keys.checked.khEnabled).toBe(true);
  });

  it('the table lists one row per kept product, with totals and the hub effect by wave', () => {
    const pf = withProduct(three(), { id: 'D' }), arch = { ...pf, products: pf.products.map((p) => (p.id === 'D' ? { ...p, archived: true } : p)) };
    const t = knowledgeTable(arch);
    expect(t.rows.map((r) => r.productId)).toEqual(['p1', 'B', 'C']);
    expectClose(t.totals.setup, t.rows.reduce((a, r) => a + r.setup, 0));
    expectClose(t.byWave.w1 as number, t.totals.hubDeltaSav);
  });
});

describe('A12: hub infrastructure allocation', () => {
  it('perProduct: every product carries the full single-case cost', () => {
    const c = loadCase('golden'), pf = three4(c);
    expect(allocateInfra(pf)).toEqual([2500, 2500, 2500, 2500]);
    for (const p of pf.products) expect(resolveProduct(pf, p.id).dom).toBe(c.dom);
    const ref = computeCase(c).model.conv.khRunYr[2];
    expectClose(computeCase(resolveProduct(pf, 'B')).model.conv.khRunYr[2] as number, ref as number);
  });

  it('byBaseEtp: the shares add up to the hub cost to the cent, in proportion to the entry headcount', () => {
    const c = loadCase('golden'), pf = { ...three4(c), hub: { enabled: true, infraMonthly: 1234.57, infraAllocation: 'byBaseEtp' as const } };
    const shares = allocateInfra(pf);
    expect(Math.round(shares.reduce((a, s) => a + s, 0) * 100)).toBe(123457);
    const etp = [1, 2, 3, 0.5].map((f) => f * c.teamIn.reduce((a, r) => a + r.etp, 0)), tot = etp.reduce((a, b) => a + b, 0);
    shares.forEach((s, i) => expect(Math.abs(s - (1234.57 * (etp[i] as number)) / tot)).toBeLessThanOrEqual(0.0100001));
    expect(pf.products.map((p) => parseFloat(resolveProduct(pf, p.id).dom.values.khInfraMonthly as string))).toEqual(shares);
  });

  it('byBaseEtp: a product that does not use the hub takes no part; a single user pays the full cost', () => {
    const c = loadCase('golden'), base = { ...three4(c), hub: { enabled: true, infraMonthly: 3000, infraAllocation: 'byBaseEtp' as const } };
    const off = { ...base, products: base.products.map((p, i) => (i === 0 ? p : { ...p, knowledge: { enabled: false } })) };
    expect(allocateInfra(off)[0]).toBe(3000);
    const none = { ...base, products: base.products.map((p) => ({ ...p, waveId: null })) };
    expect(consolidate(none).products).toEqual([]);
  });

  it('property: apportioning cents is exact for any weights', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 5_000_000 }), fc.array(fc.double({ min: 0, max: 100, noNaN: true }), { minLength: 2, maxLength: 12 }),
      (cents, w) => {
      const s = allocateCents(cents / 100, w);
      expect(s.reduce((a, x) => a + Math.round(x * 100), 0)).toBe(cents);
      expect(s.every((x) => x >= 0)).toBe(true);
    }), { numRuns: 300 });
    expect(allocateCents(10.005, [3])).toEqual([10.005]);
    expect(allocateCents(0.03, [0, 0, 0])).toEqual([0.01, 0.01, 0.01]);
  });

  it('a shared-hub portfolio carries the infrastructure once across products', () => {
    const c = loadCase('golden'), pf = { ...three4(c), hub: { enabled: true, infraMonthly: 2500, infraAllocation: 'byBaseEtp' as const } };
    const per = three4(c), annual = (p: Portfolio) => p.products.reduce((a, x) => a + runOf(resolveProduct(p, x.id)).ctx.inp.p('khInfraMonthly') * 12, 0);
    expectClose(annual(pf), 2500 * 12); expectClose(annual(per), 2500 * 12 * 4);
  });
});

function three4(c: ReturnType<typeof loadCase>): Portfolio {
  let pf = envelopeCase(c);
  pf = withProduct(pf, { id: 'B', teamIn: scaledTeam(c, 2) }); pf = withProduct(pf, { id: 'C', teamIn: scaledTeam(c, 3) });
  return withProduct(pf, { id: 'D', teamIn: scaledTeam(c, 0.5) });
}
