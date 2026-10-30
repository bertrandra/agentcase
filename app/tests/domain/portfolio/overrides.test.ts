import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyToCommon, clearOverride, envelopeCase, isOverridden, resolveProduct, setCommon, setOverride, type Portfolio } from '@/domain/portfolio';
import { scopeOf, type XDocument } from '@/domain/process';
import { caseInStore } from '@/store/persistence/bpmn/caseDoc';
import { scopedProcess } from '@/store/persistence/bpmn/legacy';
import { loadCase, withProduct } from '../../helpers/portfolio';

/** Schema v3: the scope lists live in the process document (`BPMN`), an overridable key at whole-document granularity (F-B20). */
const three = (): Portfolio => withProduct(withProduct(envelopeCase(caseInStore(loadCase('golden'))), { id: 'B' }), { id: 'C' });
const golden = three().common.BPMN;
const doc = (selectedNorms: string[]): XDocument => scopedProcess(golden, { selectedNorms });
const norms = (id: string, pf: Portfolio) => scopeOf(resolveProduct(pf, id)).selectedNorms;

describe('A5: inherit / override / clear', () => {
  it('a product inherits the common value until it overrides it', () => {
    const pf = three(), own = ['ISO-X'];
    const o = setOverride(pf, 'B', 'BPMN', doc(own));
    expect(norms('B', o)).toEqual(own);
    expect(norms('p1', o)).toEqual(norms('p1', pf));
    expect(isOverridden(o.products[1]!, 'BPMN')).toBe(true);
  });

  it('a common change reaches the inheriting products only', () => {
    const pf = setOverride(three(), 'B', 'BPMN', doc(['ISO-X'])), next = setCommon(pf, 'BPMN', doc(['N1', 'N2']));
    expect(norms('p1', next)).toEqual(['N1', 'N2']);
    expect(norms('C', next)).toEqual(['N1', 'N2']);
    expect(norms('B', next)).toEqual(['ISO-X']);
  });

  it('clearing an override restores the inheritance, and the resolved case is the original one', () => {
    const pf = three(), back = clearOverride(setOverride(pf, 'B', 'BPMN', scopedProcess(golden, { phaseOff: ['x'] })), 'B', 'BPMN');
    expect(resolveProduct(back, 'B')).toEqual(resolveProduct(pf, 'B'));
    expect(back.products[1]!.overrides).toEqual({});
    expect(clearOverride(pf, 'B', 'BPMN').products[1]).toBe(pf.products[1]);
  });

  it('overriding one key does not rebuild the other products (same resolved object)', () => {
    const pf = three(), o = setOverride(pf, 'B', 'BPMN', scopedProcess(golden, { regInclude: !scopeOf(pf.common).regInclude }));
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
    const z = doc(['Z']);
    pf = setOverride(setOverride(setOverride(pf, 'p1', 'BPMN', z), 'B', 'BPMN', doc(['Z'])), 'C', 'BPMN', doc(['W']));
    const before = ['p1', 'B', 'C'].map((id) => norms(id, pf)), next = applyToCommon(pf, 'p1', 'BPMN');
    expect(scopeOf(next.common).selectedNorms).toEqual(['Z']);
    expect(next.products.map((p) => isOverridden(p, 'BPMN'))).toEqual([false, false, true]);
    expect(['p1', 'B', 'C'].map((id) => norms(id, next))).toEqual(before);
    expect(scopeOf(pf.common).selectedNorms).not.toEqual(['Z']);
    expect(() => applyToCommon(three(), 'B', 'BPMN')).toThrow();
  });

  it('knowledge keys follow the same mechanics (khTargetCC, khA3)', () => {
    const pf = three(), o = setOverride(setOverride(pf, 'B', 'values.khTargetCC', '1'), 'B', 'values.khA3', '4');
    expect(resolveProduct(o, 'B').dom.values).toMatchObject({ khTargetCC: '1', khA3: '4' });
    expect(resolveProduct(o, 'C').dom.values.khTargetCC).toBe(pf.common.dom.values.khTargetCC);
  });

  it('property: a random edit sequence is pure and local', () => {
    const keys = ['BPMN', 'lifecycleUse', 'statusLifecycle'] as const;
    const value = (k: (typeof keys)[number], n: number): unknown => (k === 'BPMN' ? doc(['v' + n]) : k === 'lifecycleUse' ? n > 0 : [{ id: 'v' + n }]);
    const op = fc.record({ kind: fc.constantFrom('set', 'clear', 'common', 'apply'), who: fc.constantFrom('p1', 'B', 'C'), key: fc.constantFrom(...keys),
      n: fc.integer({ min: 0, max: 2 }) });
    fc.assert(fc.property(fc.array(op, { maxLength: 12 }), (ops) => {
      let pf = three();
      for (const o of ops) {
        const frozen = JSON.stringify(pf), val = value(o.key, o.n);
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
  }, 60_000);   // each step serialises the portfolio, its process documents included
});
