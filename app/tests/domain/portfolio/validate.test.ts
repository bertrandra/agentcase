import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { envelopeCase, validate, type Portfolio } from '@/domain/portfolio';
import { FIXTURE_IDS, loadCase, withProduct, withWave } from '../../helpers/portfolio';

const base = (): Portfolio => withProduct(withWave(envelopeCase(loadCase('golden')), 'w2', 6), { id: 'B', waveId: 'w2' });
const codes = (pf: Portfolio) => validate(pf).errors.map((e) => e.code);
const edit = (pf: Portfolio, id: string, f: (p: Portfolio['products'][number]) => Partial<Portfolio['products'][number]>): Portfolio => ({ ...pf, products: pf.products.map((p) => (p.id === id ? { ...p, ...f(p) } : p)) });

describe('validate: invariants of spec 4.1', () => {
  it('a well-formed portfolio has no error (every fixture wrapped, and a two-wave one)', () => {
    for (const id of FIXTURE_IDS) expect(validate(envelopeCase(loadCase(id))).errors).toEqual([]);
    expect(validate(base()).errors).toEqual([]);
  });

  it.each<[string, (pf: Portfolio) => Portfolio]>([
    ['no-product', (pf) => ({ ...pf, products: [], waves: pf.waves.map((w) => ({ ...w, productIds: [] })), activeProductId: 'zz' })],
    ['dup-product-id', (pf) => edit(pf, 'B', () => ({ id: 'p1' }))],
    ['dup-wave-id', (pf) => ({ ...pf, waves: pf.waves.map((w) => ({ ...w, id: 'w1' })) })],
    ['active-unknown', (pf) => ({ ...pf, activeProductId: 'nope' })],
    ['horizon', (pf) => ({ ...pf, horizonMonths: 0 })],
    ['hub-infra', (pf) => ({ ...pf, hub: { ...pf.hub, infraMonthly: -1 } })],
    ['wave-start', (pf) => ({ ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: -1 })) })],
    ['multi-wave', (pf) => ({ ...pf, waves: pf.waves.map((w) => ({ ...w, productIds: ['p1', 'B'] })) })],
    ['wave-mismatch', (pf) => edit(pf, 'B', () => ({ waveId: 'w1' }))],
    ['wave-mismatch', (pf) => edit(pf, 'B', () => ({ waveId: null }))],
    ['offset', (pf) => edit(pf, 'B', () => ({ offsetMonths: -2 }))],
    ['kt-lead', (pf) => edit(pf, 'B', () => ({ knowledge: { ktLeadMonths: -1 } }))],
    ['target-cc', (pf) => edit(pf, 'B', () => ({ knowledge: { targetCC: 5 } }))],
    ['domain-weights', (pf) => edit(pf, 'B', () => ({ knowledge: { domains: [{ label: 'a', weightPct: 60 }, { label: 'b', weightPct: 30 }] } }))],
    ['maturity', (pf) => edit(pf, 'B', () => ({ knowledge: { maturityAnswers: [1, 2, 3] } }))],
    ['override-key', (pf) => edit(pf, 'B', () => ({ overrides: { dom: { values: { horizon: '5' } } } }))],
    ['override-key', (pf) => edit(pf, 'B', () => ({ overrides: { RATE: {} } as never }))],
  ])('%s', (code, mutate) => {
    expect(codes(mutate(base()))).toContain(code);
  });

  it('domain weights adding up to 100 are accepted', () => {
    const ok = edit(base(), 'B', () => ({ knowledge: { domains: [{ label: 'a', weightPct: 33.5 }, { label: 'b', weightPct: 66.5 }], targetCC: 4, ktLeadMonths: 2 } }));
    expect(codes(ok)).toEqual([]);
  });

  it('property: random wave assignments that keep both sides consistent are valid; breaking one side is caught', () => {
    fc.assert(fc.property(fc.array(fc.option(fc.constantFrom('w1', 'w2'), { nil: null }), { minLength: 1, maxLength: 6 }), (assign) => {
      let pf = withWave(envelopeCase(loadCase('golden')), 'w2', 3);
      pf = { ...pf, products: [], waves: pf.waves.map((w) => ({ ...w, productIds: [] })) };
      const proto = envelopeCase(loadCase('golden')).products[0]!;
      assign.forEach((w, i) => { pf = { ...pf, products: [...pf.products, { ...proto, id: 'q' + i, waveId: w }], waves: pf.waves.map((x) => (x.id === w ? { ...x, productIds: [...x.productIds, 'q' + i] } : x)) }; });
      pf = { ...pf, activeProductId: 'q0' };
      expect(codes(pf)).toEqual([]);
      const planned = assign.findIndex((w) => w !== null);
      if (planned >= 0) expect(codes(edit(pf, 'q' + planned, () => ({ waveId: null })))).toContain('wave-mismatch');
    }), { numRuns: 40 });
  });

  it('diagnostics: capped target, unused hub', () => {
    const msi = loadCase('ctx-msi'), pf = envelopeCase(msi);
    const capped = { ...pf, products: [{ ...pf.products[0]!, knowledge: { targetCC: 4 } }] };
    expect(validate(capped).errors).toEqual([]);
    expect(validate(capped).diagnostics.map((d) => d.code)).toContain('target-capped');
    const unused = { ...envelopeCase(loadCase('golden')), hub: { enabled: true, infraMonthly: 2500, infraAllocation: 'perProduct' as const } };
    const off = { ...unused, products: unused.products.map((p) => ({ ...p, knowledge: { enabled: false } })) };
    expect(validate(off).diagnostics.map((d) => d.code)).toContain('hub-unused');
    expect(validate(unused).diagnostics.map((d) => d.code)).not.toContain('hub-unused');
  });
});
