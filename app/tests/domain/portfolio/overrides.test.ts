import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyToCommon, clearOverride, envelopeCase, isOverridden, resolveProduct, setCommon, setOverride, type Portfolio } from '@/domain/portfolio';
import { loadCase, withProduct } from '../../helpers/portfolio';

const three = (): Portfolio => withProduct(withProduct(envelopeCase(loadCase('golden')), { id: 'B' }), { id: 'C' });
const norms = (id: string, pf: Portfolio) => resolveProduct(pf, id).selectedNorms;

describe('A5: inherit / override / clear', () => {
  it('a product inherits the common value until it overrides it', () => {
    const pf = three(), own = ['ISO-X'];
    const o = setOverride(pf, 'B', 'selectedNorms', own);
    expect(norms('B', o)).toEqual(own);
    expect(norms('p1', o)).toEqual(norms('p1', pf));
    expect(isOverridden(o.products[1]!, 'selectedNorms')).toBe(true);
  });

  it('a common change reaches the inheriting products only', () => {
    const pf = setOverride(three(), 'B', 'selectedNorms', ['ISO-X']), next = setCommon(pf, 'selectedNorms', ['N1', 'N2']);
    expect(norms('p1', next)).toEqual(['N1', 'N2']);
    expect(norms('C', next)).toEqual(['N1', 'N2']);
    expect(norms('B', next)).toEqual(['ISO-X']);
  });

  it('clearing an override restores the inheritance, and the resolved case is the original one', () => {
    const pf = three(), back = clearOverride(setOverride(pf, 'B', 'phaseOff', ['x']), 'B', 'phaseOff');
    expect(resolveProduct(back, 'B')).toEqual(resolveProduct(pf, 'B'));
    expect(back.products[1]!.overrides).toEqual({});
    expect(clearOverride(pf, 'B', 'phaseOff').products[1]).toBe(pf.products[1]);
  });

  it('overriding one key does not rebuild the other products (same resolved object)', () => {
    const pf = three(), o = setOverride(pf, 'B', 'regInclude', !pf.common.regInclude);
    expect(resolveProduct(o, 'p1')).toBe(resolveProduct(pf, 'p1'));
    expect(resolveProduct(o, 'C')).toBe(resolveProduct(pf, 'C'));
    expect(resolveProduct(o, 'B')).not.toBe(resolveProduct(pf, 'B'));
  });

  it('dom fields are overridden one by one and never the horizon or the hub infrastructure', () => {
    const pf = three(), o = setOverride(setOverride(pf, 'B', 'values.targetLocPctX', '7'), 'B', 'checked.khEnabled', true);
    const b = resolveProduct(o, 'B');
    expect(b.dom.values.targetLocPctX).toBe('7');
    expect(b.dom.checked.khEnabled).toBe(true);
    expect({ ...b.dom.values, targetLocPctX: undefined }).toEqual({ ...resolveProduct(pf, 'B').dom.values, targetLocPctX: undefined });
    expect(() => setOverride(pf, 'B', 'values.horizon', '9')).toThrow();
    expect(() => setOverride(pf, 'B', 'values.khInfraMonthly', '9')).toThrow();
    expect(() => setOverride(pf, 'B', 'RATE', {})).toThrow();
    expect(() => setOverride(pf, 'B', 'values.__proto__', '1')).toThrow();
    const forced = { ...pf, products: pf.products.map((p) => (p.id === 'B' ? { ...p, overrides: { dom: { values: { horizon: '9' } } } } : p)) };
    expect(resolveProduct(forced, 'B').dom.values.horizon).toBe(pf.common.dom.values.horizon);
  });

  it('applyToCommon writes the value to the common level and drops the identical overrides only', () => {
    let pf = three();
    pf = setOverride(setOverride(setOverride(pf, 'p1', 'selectedNorms', ['Z']), 'B', 'selectedNorms', ['Z']), 'C', 'selectedNorms', ['W']);
    const before = ['p1', 'B', 'C'].map((id) => norms(id, pf)), next = applyToCommon(pf, 'p1', 'selectedNorms');
    expect(next.common.selectedNorms).toEqual(['Z']);
    expect(next.products.map((p) => isOverridden(p, 'selectedNorms'))).toEqual([false, false, true]);
    expect(['p1', 'B', 'C'].map((id) => norms(id, next))).toEqual(before);
    expect(pf.common.selectedNorms).not.toEqual(['Z']);
    expect(() => applyToCommon(three(), 'B', 'selectedNorms')).toThrow();
  });

  it('knowledge keys follow the same mechanics (khTargetCC, khA3)', () => {
    const pf = three(), o = setOverride(setOverride(pf, 'B', 'values.khTargetCC', '1'), 'B', 'values.khA3', '4');
    expect(resolveProduct(o, 'B').dom.values).toMatchObject({ khTargetCC: '1', khA3: '4' });
    expect(resolveProduct(o, 'C').dom.values.khTargetCC).toBe(pf.common.dom.values.khTargetCC);
  });

  it('property: a random edit sequence is pure and local', () => {
    const keys = ['selectedNorms', 'phaseOff', 'selectedArtefacts'] as const;
    const op = fc.record({ kind: fc.constantFrom('set', 'clear', 'common', 'apply'), who: fc.constantFrom('p1', 'B', 'C'), key: fc.constantFrom(...keys),
      n: fc.integer({ min: 0, max: 2 }) });
    fc.assert(fc.property(fc.array(op, { maxLength: 12 }), (ops) => {
      let pf = three();
      for (const o of ops) {
        const frozen = JSON.stringify(pf), val = ['v' + o.n];
        const others = pf.products.filter((p) => p.id !== o.who).map((p) => resolveProduct(pf, p.id));
        if (o.kind === 'apply') { if (isOverridden(pf.products.find((p) => p.id === o.who)!, o.key)) pf = applyToCommon(pf, o.who, o.key); continue; }
        const next = o.kind === 'set' ? setOverride(pf, o.who, o.key, val) : o.kind === 'clear' ? clearOverride(pf, o.who, o.key) : setCommon(pf, o.key, val);
        expect(JSON.stringify(pf)).toBe(frozen);
        if (o.kind !== 'common') pf.products.filter((p) => p.id !== o.who).forEach((p, i) => expect(resolveProduct(next, p.id)).toBe(others[i]));
        pf = next;
      }
      for (const p of pf.products) {
        const r = resolveProduct(pf, p.id);
        for (const k of keys) expect(r[k]).toEqual(isOverridden(p, k) ? p.overrides[k] : pf.common[k]);
      }
    }), { numRuns: 60 });
  });
});
