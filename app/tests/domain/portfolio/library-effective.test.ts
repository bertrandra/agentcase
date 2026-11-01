import { describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { resolveProduct, setOverride, type Portfolio } from '@/domain/portfolio';
import { BPMN_KEY, catalogueProcess, readProcess, type XDocument } from '@/domain/process';
import { addCall, addGlobalTask } from '@/domain/process/profile';
import { goldenAndB } from '../../helpers/portfolio';

/**
 * SPEC_FIXES FX-05 (§ 17.10 (3)): a product's own process document calls the common document's library entries; its effective case resolves
 * them (`withLibrary`). A product that calls none keeps its own document object, so no figure moves.
 */
/** The common document as a full process (the golden envelope's is an organisation carrier) with the library entries `f` adds. */
const withCommon = (pf: Portfolio, f: (d: XDocument) => XDocument): Portfolio => ({ ...pf, common: { ...pf.common, BPMN: f(catalogueProcess()) } });
const lib = (effort: number) => (d: XDocument) => addGlobalTask(d, { id: 'lib-review', name: 'Code review pattern', type: 'Human', effort, phase: 'V3' });

describe('withLibrary on a product\'s effective case', () => {
  it('the product\'s call resolves to the common entry; a library change reaches it', () => {
    const base = goldenAndB(), own = addCall(catalogueProcess(), 'V3', 'C020', 'Review (library)', 'lib-review');
    const pf = (effort: number) => setOverride(withCommon(base, lib(effort)), 'B', BPMN_KEY, own);
    const eff = (p: Portfolio) => readProcess(resolveProduct(p, 'B').BPMN as XDocument).activities.find((a) => a.id === 'C020')?.effort;
    expect(eff(pf(4))).toBe(4);
    expect(eff(pf(7))).toBe(7);
  });
  it('a product whose own document calls no library entry keeps it as it is (same object, same figures)', () => {
    const base = goldenAndB(), own = catalogueProcess(), pf = setOverride(withCommon(base, lib(4)), 'B', BPMN_KEY, own);
    const s = resolveProduct(pf, 'B');
    expect(s.BPMN).toBe(pf.products.find((p) => p.id === 'B')!.overrides.BPMN);
    expect(computeCase(s).headline).toEqual(computeCase(resolveProduct(setOverride(withCommon(base, (d) => d), 'B', BPMN_KEY, own), 'B')).headline);
  });
});
