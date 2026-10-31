import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addOrgUnit, nextUnitId, removeOrgUnit, setActivityRaci, setProductOwner, updateOrgUnit } from '@/controllers/org';
import { addProduct, duplicateProduct, removeProduct, setActiveProduct, setEditScope } from '@/controllers/product';
import { addSharedLine, removeSharedLine, setSharedPins, setSharedShare, updateSharedLine } from '@/controllers/sharedTeam';
import { addTeamRow, removeTeamRow, updateTeamRow } from '@/controllers/team';
import { readStoredOrg, storedTeamElements, unitElements, withoutTeams } from '@/domain/org';
import { effectiveTeam, productTeam, resolveProduct, validate } from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { docOnly, threeProducts } from '../helpers/portfolioStore';

/**
 * Phase B10a (docs/SPEC_BPMN.md § 21): the teams, units and owners are the organisation part of the common document. Every team / unit command
 * writes node patches of it (or of the portfolio structure, for products); undo / redo restore exactly; editing one product's team never rebuilds
 * another product's case; a product's own process document holds no organisation.
 */
type Op = (s: AppStore) => void;
const pf = (s: AppStore) => s.getState().portfolio;
const prod = (s: AppStore, i: number): string => pf(s).products[i % pf(s).products.length]!.id;
const unitIds = (s: AppStore): string[] => readStoredOrg(pf(s).common.BPMN).units.map((u) => u.id);
const line = (s: AppStore, i: number): string | undefined => {
  const ids = storedTeamElements(pf(s).common.BPMN).map((e) => e.attrs.find((a) => a.name === 'line')?.value).filter((x): x is string => !!x);
  return ids[i % Math.max(1, ids.length)];
};
const ix = fc.nat(5);
const OPS: fc.Arbitrary<Op>[] = [
  fc.record({ etp: fc.integer({ min: 0, max: 9 }) }).map(({ etp }): Op => () => addTeamRow({ etp })),
  fc.record({ r: ix, v: fc.integer({ min: 0, max: 20 }) }).map(({ r, v }): Op => () => updateTeamRow(r % 2, 'etp', v)),
  ix.map((r): Op => () => removeTeamRow(r % 3)),
  ix.map((i): Op => (s) => { addSharedLine({ allocations: { [prod(s, i)]: 40 } }); }),
  fc.record({ i: ix, p: fc.integer({ min: 0, max: 100 }) })
    .map(({ i, p }): Op => (s) => { const l = line(s, i); if (l) setSharedShare(l, prod(s, i + 1), p); }),
  fc.record({ i: ix, v: fc.integer({ min: 0, max: 5 }) }).map(({ i, v }): Op => (s) => { const l = line(s, i); if (l) updateSharedLine(l, 'etp', v); }),
  ix.map((i): Op => (s) => { const l = line(s, i); if (l) setSharedPins(l, ['A017'], true); }),
  ix.map((i): Op => (s) => { const l = line(s, i); if (l) removeSharedLine(l); }),
  ix.map((i): Op => (s) => { const us = unitIds(s); addOrgUnit({ id: nextUnitId(), name: `U${i}`, type: 'department', parent: us[i % (us.length || 1)] }); }),
  ix.map((i): Op => (s) => { const us = unitIds(s); if (us.length > 1) updateOrgUnit(us[i % us.length]!, { parent: us[(i + 1) % us.length] }); }),
  ix.map((i): Op => (s) => { const us = unitIds(s); if (us.length) removeOrgUnit(us[i % us.length]!); }),
  ix.map((i): Op => (s) => { const us = unitIds(s); setProductOwner(prod(s, i), i === 5 ? null : us[i % (us.length || 1)] ?? 'unit-delivery'); }),
  ix.map((i): Op => (s) => { if (i === 0) addProduct('New'); else if (i === 1) duplicateProduct(prod(s, i)); else if (i === 2) removeProduct(prod(s, 1)); }),
  ix.map((i): Op => (s) => { setActiveProduct(prod(s, i)); }),
];

/** The portfolio's teams agree with every product's case (the engine's entry team is the document's). */
function consistent(s: AppStore): void {
  const p = pf(s);
  expect(validate(p).errors).toEqual([]);
  for (const x of p.products) expect(resolveProduct(p, x.id).teamIn).toBe(effectiveTeam(p, x));
}

describe('undo / redo after every team and unit command (property)', () => {
  it('each command is node patches of the common document (or the portfolio structure); undo restores the state before, redo the state after', () => {
    fc.assert(fc.property(fc.array(fc.oneof(...OPS), { minLength: 1, maxLength: 10 }), (ops) => {
      const { s } = threeProducts();
      for (const op of ops) {
        const before = docOnly(s), n = s.getState().history.undo.length;
        op(s);
        consistent(s);
        const after = docOnly(s);
        if (s.getState().history.undo.length === n) { expect(after).toBe(before); continue; }   // refused, coalesced away or view state
        const e = s.getState().history.undo.at(-1)!;
        const doc = (x: { path: (string | number)[] }) => x.path[0] === 'common' && x.path[1] === 'BPMN';
        expect(e.patches.every((x) => doc(x) || ['products', 'waves', 'activeProductId'].includes(x.path[0] as string))).toBe(true);
        s.undo(); expect(docOnly(s)).toBe(before); consistent(s);
        s.redo(); expect(docOnly(s)).toBe(after); consistent(s);
      }
    }), { numRuns: 30 });
  }, 120_000);
});

describe('node patches, per-product memo, override split', () => {
  it('an FTE edit is one attribute; a new row one appended line', () => {
    const { s } = threeProducts();
    updateTeamRow(0, 'etp', 7);
    const p = s.getState().history.undo.at(-1)!.patches;
    expect(p).toHaveLength(1);
    expect(p[0]!.path.slice(0, 2)).toEqual(['common', 'BPMN']);
    expect(p[0]!.path.at(-1)).toBe('value');
    addTeamRow();
    expect(JSON.stringify(s.getState().history.undo.at(-1)!.patches).length).toBeLessThan(800);
  });
  it('editing one product\'s team keeps every other product\'s resolved case (identity) and the cases\' document', () => {
    const { s, ids } = threeProducts(), cases = ids.map((id) => resolveProduct(pf(s), id));
    addTeamRow({ etp: 2 });
    const next = ids.map((id) => resolveProduct(pf(s), id));
    expect(next[0]).not.toBe(cases[0]);
    expect(next[1]).toBe(cases[1]);
    expect(next[2]).toBe(cases[2]);
    expect(next[0]!.BPMN).toBe(cases[0]!.BPMN);
    expect(productTeam(pf(s), ids[0])).toHaveLength(cases[0]!.teamIn.length + 1);
  });
  it('a product\'s own process copies no organisation; units, owners and its team stay in the common document', () => {
    const { s, ids } = threeProducts();
    addOrgUnit({ id: 'unit-1', name: 'BU', type: 'businessUnit' });
    setEditScope('product');
    expect(setActivityRaci('A017', { R: ['role-dev'], A: 'role-lead', C: [], I: [] })).toBe(true);
    const own = pf(s).products[0]!.overrides.BPMN as XDocument;
    expect(own).toBeDefined();
    expect([unitElements(own).length, storedTeamElements(own).length]).toEqual([0, 0]);
    addTeamRow(); setProductOwner(ids[0], 'unit-1'); addOrgUnit({ id: 'unit-2', name: 'Dept', type: 'department', parent: 'unit-1' });
    expect(pf(s).products[0]!.overrides.BPMN).toBe(own);
    expect(readStoredOrg(pf(s).common.BPMN).units.map((u) => u.id)).toEqual(['unit-1', 'unit-2']);
    expect(withoutTeams(pf(s).common.BPMN)).not.toBe(pf(s).common.BPMN);
    expect(resolveProduct(pf(s), ids[0]).teamIn).toEqual(productTeam(pf(s), ids[0]));
  });
});
