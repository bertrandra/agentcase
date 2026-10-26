import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MEASURES, consolidate, envelopeCase, validate, type Portfolio } from '@/domain/portfolio';
import { cumulativeOf as cumulative } from '@/domain/economics/cashflow';
import { expectClose, expectSeriesClose, loadCase, shiftWaves } from '../../helpers/portfolio';

/** golden (hub on) with its wave starting at `start`, the product preparing its KT `lead` months ahead. */
function withLead(lead: number | undefined, start = 6, id = 'golden'): Portfolio {
  const pf = shiftWaves(envelopeCase(loadCase(id)), start), p = pf.products[0]!;
  return { ...pf, products: [{ ...p, knowledge: lead === undefined ? {} : { ktLeadMonths: lead } }] };
}
const UNCHANGED = ['savings', 'run', 'token', 'infra', 'humanFte', 'agentVfte', 'ktAvoided', 'khCost', 'adoptionW'] as const;

describe('A13: ktLeadMonths moves only the KT setup cost', () => {
  it('k = 0 changes nothing', () => {
    const a = consolidate(withLead(undefined)), b = consolidate(withLead(0));
    for (const m of MEASURES) expect(b.series[m]).toEqual(a.series[m]);
    expect(b.summary.paybackMonth).toBe(a.summary.paybackMonth);
    expect(a.series.ktSetup.reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
  });

  it('k months earlier: only setup, net and ktSetup move, by exactly the KT part; cash, NPV and payback follow', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 6 }), (k) => {
      const a = consolidate(withLead(0)), b = consolidate(withLead(k));
      for (const m of UNCHANGED) expect(b.series[m]).toEqual(a.series[m]);
      expectSeriesClose(b.series.ktSetup.slice(0, -k), a.series.ktSetup.slice(k));
      const dSetup = b.series.setup.map((x, i) => x - (a.series.setup[i] as number)), dKt = b.series.ktSetup.map((x, i) => x - (a.series.ktSetup[i] as number));
      expectSeriesClose(dSetup, dKt);
      expectSeriesClose(b.series.net.map((x, i) => x - (a.series.net[i] as number)), dKt.map((x) => -x));
      expectClose(b.summary.setup, a.summary.setup); expectClose(b.summary.net, a.summary.net);
      const d = 1 + a.rate / 12, part = a.series.ktSetup.reduce((x, y) => x + y, 0) / 6;
      let dn = 0;
      for (let t = 1; t <= 6; t++) dn += part * (Math.pow(d, -(6 + t)) - Math.pow(d, -(6 - k + t)));
      expectClose(b.summary.npv - a.summary.npv, dn, 1e-7);
      const cum = cumulative(b.series.net), first = 6 - k + 1;
      expect(b.summary.paybackMonth).toBe(cum.findIndex((x, i) => i + 1 >= first && x >= 0) + 1);
      expect(b.summary.first).toBe(first);
    }), { numRuns: 12 });
  });

  it('the preparation never goes before calendar month 1: the lead is capped and a diagnostic says so', () => {
    const pf = withLead(5, 2), c = consolidate(pf), ref = consolidate(withLead(2, 2));
    expect(c.products[0]!.lead).toBe(2);
    for (const m of MEASURES) expect(c.series[m]).toEqual(ref.series[m]);
    expect(validate(pf).diagnostics.map((d) => d.code)).toContain('kt-lead-clamped');
    expect(validate(withLead(2, 2)).diagnostics.map((d) => d.code)).not.toContain('kt-lead-clamped');
  });

  it('a product that does not use the hub has nothing to move', () => {
    const off = consolidate(withLead(4, 6, 'kh-off')), ref = consolidate(withLead(0, 6, 'kh-off'));
    for (const m of MEASURES) expect(off.series[m]).toEqual(ref.series[m]);
    expect(off.summary.first).toBe(7);
  });

  it('two waves: preparing wave 2 during wave 1 shows as an earlier KT cost of wave 2 only', () => {
    const pf = withLead(0, 0), two: Portfolio = { ...pf, waves: [...pf.waves, { id: 'w2', name: 'W2', startMonth: 12, productIds: ['p2'] }] };
    const p2 = { ...pf.products[0]!, id: 'p2', waveId: 'w2' },
      lead = (k: number): Portfolio => ({ ...two, products: [pf.products[0]!, { ...p2, knowledge: { ktLeadMonths: k } }] });
    const a = consolidate(lead(0)), b = consolidate(lead(9));
    expect(b.waves[0]!.series.net).toEqual(a.waves[0]!.series.net);
    expect(b.waves[1]!.series.savings).toEqual(a.waves[1]!.series.savings);
    expect(b.waves[1]!.series.ktSetup).not.toEqual(a.waves[1]!.series.ktSetup);
  });
});
