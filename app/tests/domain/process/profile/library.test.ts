import { describe, expect, it } from 'vitest';
import { catalogueProcess, el, readProcess, serialize, type XDocument } from '@/domain/process';
import { addCall, addGlobalTask, callsOf, libraryOf, withLibrary } from '@/domain/process/profile';
import { DEFINITIONS_RANK, insertIn } from '@/domain/process/profile/tree';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../../helpers/bpmnValidate';

/**
 * Phase B5b, F-B52: the shared process library. Patterns are modelled once (global tasks, global processes), called from the phases; across
 * products, a product's own document calls the common document's entries, and an entry of its own overrides the common one.
 */
const base = catalogueProcess();
const lib = (effort = 4): XDocument => addGlobalTask(addGlobalTask(base, { id: 'lib-review', name: 'Code review pattern', type: 'Human', effort, phase: 'V3' }),
  { id: 'lib-signoff', name: 'Regulatory sign-off', type: 'Manual', effort: 1, phase: 'V7' });
const releaseProcess = el('bpmn:process', { id: 'lib-release', name: 'Release to production', isExecutable: 'false' }, [
  el('bpmn:userTask', { id: 'lib-release-1', name: 'Change approval' }, [el('bpmn:extensionElements', {}, [el('ac:activity', { type: 'Human', phase: 'L8',
    effort: 2 })])]),
  el('bpmn:scriptTask', { id: 'lib-release-2', name: 'Deploy' }, [el('bpmn:extensionElements', {}, [el('ac:activity', { type: 'Script', phase: 'L8',
    effort: 3 })])]),
]);
const product = (d: XDocument): XDocument => addCall(addCall(d, 'V3', 'C020', 'Review (library)', 'lib-review'), 'L8', 'C021', 'Release', 'lib-release');

describe('library entries and calls', () => {
  it('global tasks and processes no pool shows are library entries, with their effort', () => {
    const d = insertIn(lib(), null, releaseProcess, DEFINITIONS_RANK);
    expect(libraryOf(d.root)).toEqual([
      { id: 'lib-review', name: 'Code review pattern', kind: 'task', element: 'globalUserTask', effort: 4, type: 'Human' },
      { id: 'lib-signoff', name: 'Regulatory sign-off', kind: 'task', element: 'globalManualTask', effort: 1, type: 'Manual' },
      { id: 'lib-release', name: 'Release to production', kind: 'process', element: 'process', effort: 5 },
    ]);
    expect(libraryOf(base.root)).toEqual([]);
  });
  it('a call resolves in its own document, else in the common library; the process entry counts its tasks', () => {
    const common = insertIn(lib(), null, releaseProcess, DEFINITIONS_RANK), p = product(base);
    expect(callsOf(p.root).map((c) => [c.id, c.resolved])).toEqual([['C020', false], ['C021', false]]);
    expect(callsOf(p.root, libraryOf(common.root))).toEqual([{ id: 'C020', called: 'lib-review', resolved: true, effort: 4, own: false },
      { id: 'C021', called: 'lib-release', resolved: true, effort: 5, own: false }]);
  });
});

describe('across products (withLibrary)', () => {
  it('the product gets the common entries it calls; a library change reaches it; its own entry overrides the common one', () => {
    const p = product(base), eff = (d: XDocument, id: string) => readProcess(d).activities.find((a) => a.id === id)?.effort;
    expect(eff(withLibrary(p, lib(4)), 'C020')).toBe(4);
    expect(eff(withLibrary(p, lib(6)), 'C020')).toBe(6);
    const own = addGlobalTask(p, { id: 'lib-review', name: 'Our review', type: 'Human', effort: 9, phase: 'V3' });
    expect(eff(withLibrary(own, lib(6)), 'C020')).toBe(9);
    expect(withLibrary(base, lib())).toBe(base);
    expect(libraryOf(withLibrary(p, lib()).root).map((e) => e.id)).toEqual(['lib-review']);
  });
  it('round trip, and the documents validate', () => {
    const d = withLibrary(product(base), insertIn(lib(), null, releaseProcess, DEFINITIONS_RANK)), text = serialize(d);
    expect(serialize(parseBpmn(text).doc!)).toBe(text);
    expect(libraryOf(parseBpmn(text).doc!.root)).toEqual(libraryOf(d.root));
    if (schemaTestsRun()) expect(validateText(text, 'library.bpmn')).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});
