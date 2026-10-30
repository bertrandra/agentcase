import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { resetAgent, resetEffort, setAgentSup, setEffort, setPhaseAgent } from '@/controllers/artefacts';
import { setIndustry, setRegInclude, setRegUse, toggleCross, toggleNorm } from '@/controllers/frame';
import { selectAllPhases, setSeq, toggleArtefact, togglePhase, toggleRegArtefact } from '@/controllers/scope';
import { resetSkillMap, setSkillMap } from '@/controllers/verifyA';
import { SCOPE_KEYS, scopeOf } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { readFileSync } from 'node:fs';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { freshStore } from './helpers';

/**
 * Phase B3 (docs/SPEC_BPMN.md § 6.1, § 9): every legacy scope command edits the case's process document (node tree), undoably, with node-level
 * patches, and never writes a scope key back into the case.
 */
type Op = () => void;
const tree = (s: AppStore): string => JSON.stringify(s.getState().portfolio.common.BPMN);
const lastPatch = (s: AppStore): string => JSON.stringify(s.getState().history.undo.at(-1)?.patches ?? []);

describe('patch size: an edit of one activity is a patch of that attribute, not of the document', () => {
  it('setEffort / setAgentSup / toggleArtefact / togglePhase / setSeq / setRegInclude stay tiny next to the 400 KB document', () => {
    const s = freshStore(), doc = tree(s).length;
    expect(doc).toBeGreaterThan(1_000_000);
    const cases: [string, Op, number][] = [
      ['setEffort', () => setEffort('A017', 9), 400], ['setAgentSup', () => setAgentSup('A017', 42), 600],
      ['toggleArtefact', () => toggleArtefact('A017', false), 600], ['togglePhase', () => togglePhase('V3', false), 20_000],
      ['setSeq', () => setSeq('phase', 'V3', 7), 600], ['setRegInclude', () => setRegInclude(false), 2_000],
    ];
    for (const [name, op, max] of cases) {
      op();
      const p = lastPatch(s);
      expect(p.length, name).toBeLessThan(max);
      expect(p, name).not.toContain('"kind":"document"');
    }
    const effort = JSON.parse(lastPatchOf(s, 'artefact.setEffort')) as { path: unknown[]; value: unknown }[];
    expect(effort).toHaveLength(1);
    expect(effort[0]?.path.at(-1)).toBe('value');
    expect(effort[0]?.value).toBe('9');
  });
  it('never stores a scope key in the case, whatever the command', () => {
    const s = freshStore();
    togglePhase('V2', false); setEffort('A001', 3); setRegUse(true); setIndustry('MED'); setSkillMap('Dev', 'Arch/Design');
    const c = s.getState().portfolio.common as unknown as Record<string, unknown>;
    for (const k of SCOPE_KEYS) expect(k in c, k).toBe(false);
    expect(scopeOf(s.getState().doc).skillMap?.Dev).toBe('Arch/Design');
  });
});
function fixtureStore(id: string, now: () => number): AppStore {
  const s = createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), { now });
  setAppStore(s);
  return s;
}
function lastPatchOf(s: AppStore, type: string): string {
  return JSON.stringify(s.getState().history.undo.filter((e) => e.type === type).at(-1)?.patches ?? []);
}

const phases = ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10', 'Cross-cutting'];
const arts = ['A001', 'A010', 'A017', 'A030', 'A053', 'R001', 'R050', 'R200'];
const ops: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ id: fc.constantFrom(...arts), on: fc.boolean() })
    .map(({ id, on }): Op => () => (id.startsWith('R') ? toggleRegArtefact(id, on) : toggleArtefact(id, on))),
  fc.record({ ph: fc.constantFrom(...phases), on: fc.boolean() }).map(({ ph, on }): Op => () => togglePhase(ph, on)),
  fc.boolean().map((on): Op => () => selectAllPhases(on)),
  fc.record({ id: fc.constantFrom(...arts), v: fc.integer({ min: 0, max: 100 }) }).map(({ id, v }): Op => () => setAgentSup(id, v)),
  fc.record({ id: fc.constantFrom(...arts), v: fc.integer({ min: -2, max: 40 }) }).map(({ id, v }): Op => () => setEffort(id, v)),
  fc.record({ ph: fc.constantFrom(...phases), v: fc.integer({ min: 0, max: 100 }) }).map(({ ph, v }): Op => () => setPhaseAgent(ph, v)),
  fc.record({ k: fc.constantFrom<'phase' | 'artefact'>('phase', 'artefact'), v: fc.option(fc.integer({ min: 0, max: 12 }), { nil: null }) })
    .map(({ k, v }): Op => () => setSeq(k, k === 'phase' ? 'V4' : 'A017', v)),
  fc.boolean().map((on): Op => () => setRegInclude(on)), fc.boolean().map((on): Op => () => setRegUse(on)),
  fc.constantFrom('NONE', 'MED', 'AERO', 'AUTO').map((c): Op => () => setIndustry(c)),
  fc.record({ c: fc.constantFrom('AI', 'SUSTAINABILITY'), on: fc.boolean() }).map(({ c, on }): Op => () => toggleCross(c, on)),
  fc.boolean().map((on): Op => () => toggleNorm('MED', 'ISO 13485', on)),
  fc.constantFrom('Arch/Design', 'Dev', 'Test/QA').map((t): Op => () => setSkillMap('Dev', t)),
  fc.constant<Op>(() => resetSkillMap()), fc.constant<Op>(() => resetAgent()), fc.constant<Op>(() => resetEffort()),
);

describe('undo / redo of the scope commands restore the exact tree (property)', () => {
  it('after every command, undo gives back the previous tree and redo the next one', () => {
    fc.assert(fc.property(fc.array(ops, { minLength: 1, maxLength: 10 }), fc.boolean(), (seq, regulated) => {
      let clock = 0;
      const s = regulated ? fixtureStore('industry-med', () => (clock += 10_000)) : freshStore(() => (clock += 10_000));
      for (const op of seq) {
        const before = tree(s), n = s.getState().history.undo.length;
        op();
        const after = tree(s);
        if (s.getState().history.undo.length === n) { expect(after).toBe(before); continue; }
        s.undo(); expect(tree(s)).toBe(before);
        s.redo(); expect(tree(s)).toBe(after);
      }
    }), { numRuns: 25 });
  }, 120_000);
});
