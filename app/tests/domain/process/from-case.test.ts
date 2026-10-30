import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PHASES, REG_ARTEFACTS, REG_NORMS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { catalogueProcess, processFromCase, readProcess, scopeKeysOf, serialize, viewsOf } from '@/domain/process';
import defaultDoc from '@/store/defaults/defaultDoc.json';

/** processFromCase / viewsOf are inverse on the scope keys, whatever the lists hold: any order, unknown ids, repeats, partial edits. */
/** A version 2 case (the default case as the legacy file holds it, its scope keys included): what `processFromCase` reads. */
type CaseState = Record<string, unknown> & { phaseSeq?: { id: string; seq: number | null }[] };
const base = (): CaseState => structuredClone(defaultDoc) as unknown as CaseState;
const roundTrip = (c: CaseState) => viewsOf(processFromCase(c)).keys;
const sdlcIds = SDLC_ARTEFACTS.map((a) => a.id), regIds = REG_ARTEFACTS.map((a) => a.id), phaseIds = [...PHASES.map((p) => p.id), 'Cross-cutting'];
const normKeys = REG_NORMS.map((n) => `${n.industry}:${n.name}`);
const unknown = fc.constantFrom('X1', 'ISO 26262');
const listOf = (ids: string[]) => fc.array(fc.oneof({ weight: 9, arbitrary: fc.constantFrom(...ids) }, { weight: 1, arbitrary: unknown }), { maxLength: 12 });
const edit = (ids: string[]) => fc.record({ id: fc.constantFrom(...ids), effort: fc.integer({ min: 0, max: 40 }), humanSup: fc.integer({ min: 0, max: 100 }),
  agentSup: fc.integer({ min: 0, max: 100 }), seq: fc.integer({ min: 1, max: 9 }) }, { requiredKeys: ['id'] });
const uniqueEdits = (ids: string[]) => fc.uniqueArray(edit(ids), { selector: (e) => e.id, maxLength: 8 });

describe('processFromCase ∘ viewsOf on arbitrary scope keys', () => {
  it('gives back every list exactly (order, unknown ids and repeats included) and every partial edit list', () => {
    fc.assert(fc.property(listOf(sdlcIds), listOf(regIds), listOf(phaseIds), listOf(normKeys), uniqueEdits(sdlcIds), uniqueEdits(regIds), fc.boolean(),
      (sel, selReg, off, norms, ed, regEd, inc) => {
        const c = { ...base(), selectedArtefacts: sel, selectedRegArtefacts: selReg, phaseOff: off, selectedNorms: norms, artefactsEdited: ed,
          regArtefactsEdited: regEd, regInclude: inc } as CaseState;
        expect(roundTrip(c)).toStrictEqual(scopeKeysOf(c));
      }), { numRuns: 60, seed: 20261030 });
  });
  it('ramp-up sequences: values, null entries, any order, an empty list and an absent key', () => {
    const c = { ...base(), phaseSeq: [{ id: 'V3', seq: 2 }, { id: 'Cross-cutting', seq: null }, { id: 'L0', seq: 7 }] } as CaseState;
    expect(roundTrip(c).phaseSeq).toEqual(c.phaseSeq);
    expect(roundTrip({ ...base(), phaseSeq: [] } as CaseState).phaseSeq).toEqual([]);
    const none = { ...base() } as CaseState;
    delete none.phaseSeq;
    expect(roundTrip(none)).not.toHaveProperty('phaseSeq');
  });
  it('skill map: an edited mapping, a removed key, a new role, and an absent map', () => {
    const map = { ...(base() as unknown as { skillMap: Record<string, string> }).skillMap, Dev: 'Lead', 'New role': 'Data' } as Record<string, string>;
    delete map.QA;
    const doc = processFromCase({ ...base(), skillMap: map } as unknown as CaseState);
    expect(viewsOf(doc).keys.skillMap).toStrictEqual(map);
    expect(readProcess(doc).actors.find((a) => a.name === 'New role')).toMatchObject({ id: 'role-new-role', kind: 'role', teamSkill: 'Data' });
    expect(readProcess(doc).actors.find((a) => a.name === 'QA')?.teamSkill).toBeUndefined();
    const none = { ...base() } as Record<string, unknown>;
    delete none.skillMap;
    expect(roundTrip(none as unknown as CaseState)).not.toHaveProperty('skillMap');
  });
  it('edited values are the activity parameters themselves (no second layer), and the base document is never mutated', () => {
    const before = serialize(catalogueProcess());
    const c = { ...base(), artefactsEdited: [{ id: 'A017', effort: 21, humanSup: 40, agentSup: 60 }] } as CaseState;
    const a = readProcess(processFromCase(c)).activities.find((x) => x.id === 'A017');
    expect(a).toMatchObject({ effort: 21, human: 40, agent: 60, seq: 1, edited: ['agentSup', 'humanSup', 'effort'] });
    expect(viewsOf(processFromCase(c)).sdlc.find((x) => x.id === 'A017')).toMatchObject({ effort: 21, humanSup: 40, agentSup: 60 });
    expect(serialize(catalogueProcess())).toBe(before);
  });
  it('unchanged parts keep their identity (small undo patches later) and views are memoised on the document', () => {
    const d1 = processFromCase(base()), d2 = processFromCase({ ...base(), regInclude: false } as CaseState);
    const diagram = (r: typeof d1.root) => r.children.find((x) => x.kind === 'element' && x.local === 'BPMNDiagram');
    expect(diagram(d1.root)).toBe(diagram(catalogueProcess().root));
    expect(diagram(d2.root)).toBe(diagram(d1.root));
    expect(viewsOf(d1)).toBe(viewsOf(d1));
    expect(readProcess(d1)).toBe(readProcess(d1));
  });
});
