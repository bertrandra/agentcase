import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resetAgent, setAgentSup, setEffort, setPhaseAgent } from '@/controllers/artefacts';
import { setChecked, setInput } from '@/controllers/inputs';
import { setLifecyclePos } from '@/controllers/lifecycle';
import { togglePhase } from '@/controllers/scope';
import { addTeamRow, removeTeamRow, updateTeamRow } from '@/controllers/team';
import { redo, undo } from '@/controllers/history';
import { computeCase } from '@/domain';
import { freshStore } from './helpers';

const expected = (id: string) => JSON.parse(readFileSync(`fixtures/expected/${id}.json`, 'utf8')).model;
const sav = (s: ReturnType<typeof freshStore>) => computeCase(s.getState().doc).model.yearSav;
const near = (a: number[], b: number[]) => a.forEach((v, i) => expect(Math.abs(v - (b[i] as number))).toBeLessThan(1e-6 * Math.max(1, Math.abs(b[i] as number))));

describe('controllers reproduce the legacy results of the same edits', () => {
  it('artefact edits (% auto and effort) == legacy fixture artefact-edits', () => {
    const s = freshStore();
    ['A017', 'A018', 'A008'].forEach((id, i) => { setAgentSup(id, [100, 30, 80][i] as number); setEffort(id, [12, 8, 6][i] as number); });
    near(sav(s), expected('artefact-edits').yearSav);
    expect(s.getState().doc.dom.values.autoPotential).toBe(String(expected('artefact-edits').auto));
  });
  it('excluding phases == legacy fixture scope-reduced', () => {
    const s = freshStore();
    ['L0', 'V2', 'V5', 'V7', 'L8', 'L9', 'L10'].forEach((p) => togglePhase(p, false));
    ['V1', 'V3', 'V4', 'V6'].forEach((p) => togglePhase(p, true));   // switching a phase on selects all its artefacts
    near(sav(s), expected('scope-reduced').yearSav);
  });
  it('cascade: a whole phase to 100 % raises potential, lowers the ceiling and raises Y3 savings', () => {
    const s = freshStore(), before = computeCase(s.getState().doc);
    setPhaseAgent('V1', 100);
    const after = computeCase(s.getState().doc);
    expect(after.model.auto).toBeGreaterThan(before.model.auto);
    expect(after.model.ceiling).toBeLessThan(before.model.ceiling);
    expect((after.model.yearSav[2] as number)).toBeGreaterThan(before.model.yearSav[2] as number);
    undo();
    expect(computeCase(s.getState().doc).model.yearSav).toEqual(before.model.yearSav);
    redo();
    expect(computeCase(s.getState().doc).model.auto).toBe(after.model.auto);
  });
  it('input and lifecycle edits == legacy fixtures', () => {
    let s = freshStore(); setLifecyclePos(0); near(sav(s), expected('lifecycle-pos-0').yearSav);
    s = freshStore(); setInput('engagementCtx', 'MSI'); near(sav(s), expected('ctx-msi').yearSav);
    s = freshStore(); setChecked('fitAuto', false); setInput('autoPotential', '60'); near(sav(s), expected('fit-off-manual').yearSav);
  });
  it('fit-to-scope off keeps the manual potential through scope edits', () => {
    const s = freshStore(); setChecked('fitAuto', false); setInput('autoPotential', '60'); setPhaseAgent('V1', 100);
    expect(s.getState().doc.dom.values.autoPotential).toBe('60');
  });
  it('% auto is clamped and rounded; resetAgent restores the defaults', () => {
    const s = freshStore(); const start = JSON.stringify(s.getState().doc.artefactsEdited);
    setAgentSup('A017', 140); expect(s.getState().doc.artefactsEdited.find((e) => e.id === 'A017')?.agentSup).toBe(100);
    setAgentSup('A017', 'abc');   // ignored
    resetAgent(); expect(JSON.stringify(s.getState().doc.artefactsEdited.map((e) => ({ id: e.id, a: e.agentSup })))).toBe(JSON.stringify(JSON.parse(start).map((e: { id: string; agentSup: number }) => ({ id: e.id, a: e.agentSup }))));
  });
  it('team rows: add, edit (snapped to 0.5), remove (never the last)', () => {
    const s = freshStore(), n = s.getState().doc.teamIn.length;
    addTeamRow(); expect(s.getState().doc.teamIn).toHaveLength(n + 1);
    updateTeamRow(n, 'etp', 2.3); expect(s.getState().doc.teamIn[n]?.etp).toBe(2.5);
    removeTeamRow(n); expect(s.getState().doc.teamIn).toHaveLength(n);
    for (let i = 0; i < 10; i++) removeTeamRow(0);
    expect(s.getState().doc.teamIn.length).toBe(1);
  });
  it('never leaves an empty scope', () => {
    const s = freshStore();
    ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10'].forEach((p) => togglePhase(p, false));
    expect(s.getState().doc.selectedArtefacts.length).toBeGreaterThan(0);
  });
});
