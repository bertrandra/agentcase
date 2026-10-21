import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { setAgentSup, setEffort, setPhaseAgent, resetAgent } from '@/controllers/artefacts';
import { setChecked, setInput } from '@/controllers/inputs';
import { setLifecyclePos, setLifecycleUse } from '@/controllers/lifecycle';
import { addTeamRow, removeTeamRow, updateTeamRow } from '@/controllers/team';
import { toggleArtefact as _t, togglePhase } from '@/controllers/scope';
import { SDLC_ARTEFACTS } from '@/domain';
import { freshStore, snap } from './helpers';

const ids = SDLC_ARTEFACTS.map((a) => a.id);
const phases = ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10'];
type Op = () => void;
const ops = fc.oneof(
  fc.record({ id: fc.constantFrom(...ids), v: fc.integer({ min: 0, max: 100 }) }).map(({ id, v }): Op => () => setAgentSup(id, v)),
  fc.record({ id: fc.constantFrom(...ids), v: fc.integer({ min: 0, max: 20 }) }).map(({ id, v }): Op => () => setEffort(id, v)),
  fc.record({ p: fc.constantFrom(...phases), v: fc.integer({ min: 0, max: 100 }) }).map(({ p, v }): Op => () => setPhaseAgent(p, v)),
  fc.record({ id: fc.constantFrom(...ids), on: fc.boolean() }).map(({ id, on }): Op => () => _t(id, on)),
  fc.record({ p: fc.constantFrom(...phases), on: fc.boolean() }).map(({ p, on }): Op => () => togglePhase(p, on)),
  fc.integer({ min: 1, max: 60 }).map((v): Op => () => setInput('y1Ramp', v)),
  fc.integer({ min: 0, max: 100 }).map((v): Op => () => setLifecyclePos(v)),
  fc.boolean().map((v): Op => () => setLifecycleUse(v)),
  fc.boolean().map((v): Op => () => setChecked('fitAuto', v)),
  fc.constant<Op>(() => resetAgent()),
  fc.constant<Op>(() => addTeamRow()),
  fc.integer({ min: 0, max: 3 }).map((i): Op => () => removeTeamRow(i)),
  fc.record({ i: fc.integer({ min: 0, max: 3 }), v: fc.integer({ min: 0, max: 30 }) }).map(({ i, v }): Op => () => updateTeamRow(i, 'etp', v)),
);

describe('undo/redo properties', () => {
  it('undoing everything restores the initial document; redoing everything restores the final one', () => {
    fc.assert(fc.property(fc.array(ops, { minLength: 1, maxLength: 25 }), (seq) => {
      let t = 0;
      const s = freshStore(() => (t += 10_000));   // far apart: no coalescing, one step per operation
      const initial = snap(s);
      seq.forEach((op) => op());
      const final = snap(s), steps = s.getState().history.undo.length;
      while (s.undo()) { /* all the way back */ }
      expect(snap(s)).toBe(initial);
      while (s.redo()) { /* and forward again */ }
      expect(snap(s)).toBe(final);
      expect(s.getState().history.undo.length).toBe(steps);
    }), { numRuns: 60 });
  });
  it('jumpTo reaches every intermediate state exactly', () => {
    fc.assert(fc.property(fc.array(ops, { minLength: 2, maxLength: 12 }), (seq) => {
      let t = 0;
      const s = freshStore(() => (t += 10_000));
      const states = [snap(s)];
      seq.forEach((op) => { const before = s.getState().history.undo.length; op(); if (s.getState().history.undo.length > before) states.push(snap(s)); });
      for (let i = states.length - 1; i >= 0; i--) { s.jumpTo(i); expect(snap(s)).toBe(states[i]); }
    }), { numRuns: 40 });
  });
});
