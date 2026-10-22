import { describe, expect, it } from 'vitest';
import { commonSubsetValue, envelopeCase, infraView, knowledgeRow, knowledgeTable, knowledgeTotals, waveEffects, waveEffectsTotal, type Portfolio } from '@/domain/portfolio';
import { expectClose, loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const golden = loadCase('golden');
/** Three hub products: p1 and B in wave w1, C in a second wave starting at month 6; D is unplanned. */
function four(): Portfolio {
  let pf = withWave(withProduct(withProduct(envelopeCase(golden), { id: 'B', teamIn: scaledTeam(golden, 2) }), { id: 'D', waveId: null }), 'w2', 6);
  pf = withProduct(pf, { id: 'C', waveId: 'w2', teamIn: scaledTeam(golden, 3) });
  return pf;
}

describe('waveEffects (F31)', () => {
  it('sums the product deltas per wave and equals the table byWave', () => {
    const pf = four(), t = knowledgeTable(pf), ws = waveEffects(pf, t.rows);
    expect(ws.map((w) => [w.waveId, w.products, w.users])).toEqual([['w1', 2, 2], ['w2', 1, 1]]);
    for (const w of ws) expectClose(w.hubDeltaSav, t.byWave[w.waveId] as number);
    const mine = t.rows.filter((r) => r.waveId === 'w1');
    expectClose(ws[0]!.hubDeltaSav, mine.reduce((a, r) => a + r.hubDeltaSav, 0));
    expectClose(ws[0]!.setup, mine.reduce((a, r) => a + r.setup, 0));
  });
  it('the total excludes the unplanned product; knowledgeTotals of a subset of rows sums that subset', () => {
    const pf = four(), t = knowledgeTable(pf), tot = waveEffectsTotal(waveEffects(pf, t.rows));
    const planned = t.rows.filter((r) => r.waveId !== null);
    expectClose(tot.hubDeltaSav, knowledgeTotals(planned).hubDeltaSav);
    expect(tot.products).toBe(3);
    expect(t.rows).toHaveLength(4);
    expectClose(knowledgeTotals(t.rows).setup, t.totals.setup);
    expect(knowledgeTotals([])).toEqual({ setup: 0, annual: 0, ktDays: 0, ktAvoided: 0, hubDeltaSav: 0 });
  });
  it('a wave without product is listed with zeros', () => {
    const pf = withWave(envelopeCase(golden), 'empty', 3), w = waveEffects(pf, knowledgeTable(pf).rows).find((x) => x.waveId === 'empty')!;
    expect([w.products, w.users, w.hubDeltaSav]).toEqual([0, 0, 0]);
  });
});

describe('knowledgeRow.lead', () => {
  it('is the configured preparation (0 when inherited)', () => {
    const pf = four(), edited = { ...pf, products: pf.products.map((p) => (p.id === 'B' ? { ...p, knowledge: { ktLeadMonths: 4 } } : p)) };
    expect([knowledgeRow(edited, 'B').lead, knowledgeRow(edited, 'p1').lead]).toEqual([4, 0]);
  });
});

describe('infraView (A12 in the UI)', () => {
  const hub = (pf: Portfolio, infraAllocation: 'perProduct' | 'byBaseEtp', infraMonthly = 3000): Portfolio => ({ ...pf, hub: { enabled: true, infraMonthly, infraAllocation } });
  it('perProduct: each hub user carries the full cost', () => {
    const pf = hub(four(), 'perProduct'), v = infraView(pf, knowledgeTable(pf).rows);
    expect(v.shares.map((s) => [s.productId, s.monthly])).toEqual([['p1', 3000], ['B', 3000], ['C', 3000]]);
    expect([v.sum, v.expected, v.conserved]).toEqual([9000, 9000, true]);
  });
  it('byBaseEtp: the shares of the users add up to the hub cost to the cent, proportional to the entry headcount', () => {
    const pf = hub(four(), 'byBaseEtp', 1234.57), v = infraView(pf, knowledgeTable(pf).rows);
    expect(v.sum).toBe(1234.57);
    expect(v.conserved).toBe(true);
    expect(v.shares.map((s) => s.productId)).toEqual(['p1', 'B', 'C']);
    expect(v.shares[2]!.monthly).toBeGreaterThan(v.shares[1]!.monthly);
    expect(v.shares[1]!.annual).toBeCloseTo(v.shares[1]!.monthly * 12, 6);
  });
  it('a product that does not use the hub is not charged; a single user pays everything; nobody: nothing expected', () => {
    const base = hub(four(), 'byBaseEtp'), off = { ...base, products: base.products.map((p) => (p.id === 'p1' ? p : { ...p, knowledge: { enabled: false } })) };
    const v = infraView(off, knowledgeTable(off).rows);
    expect(v.shares).toHaveLength(1);
    expect([v.sum, v.conserved]).toEqual([3000, true]);
    const none = { ...base, products: base.products.map((p) => ({ ...p, knowledge: { enabled: false } })) }, n = infraView(none, knowledgeTable(none).rows);
    expect([n.shares.length, n.sum, n.expected, n.conserved]).toEqual([0, 0, 0, true]);
  });
});

describe('commonSubsetValue', () => {
  it('reads what a product inherits', () => {
    const c = envelopeCase(golden).common;
    expect(commonSubsetValue(c, 'enabled')).toBe(true);
    expect(commonSubsetValue(c, 'targetCC')).toBe('CC' + golden.dom.values.khTargetCC);
    expect(commonSubsetValue(c, 'ktLeadMonths')).toBe(0);
    expect(commonSubsetValue(c, 'domains')).toBeUndefined();
    expect((commonSubsetValue(c, 'maturityAnswers') as string).split(' · ')).toHaveLength(9);
  });
});
