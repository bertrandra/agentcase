import { describe, expect, it } from 'vitest';
import.meta.glob('/src/controllers/*.ts', { eager: true });   // registers every command, so a new one cannot be forgotten
import { COMMAND_REGISTRY } from '@/store/commands';
import { setAgentSup, setEffort, setPhaseAgent, resetAgent, resetEffort } from '@/controllers/artefacts';
import { setChecked, setInput } from '@/controllers/inputs';
import { setLifecyclePos, setLifecycleUse, setLifecycleWeight } from '@/controllers/lifecycle';
import { toggleArtefact, togglePhase } from '@/controllers/scope';
import { addTeamRow, removeTeamRow, updateTeamRow } from '@/controllers/team';
import { setCustomerName, setPersona } from '@/controllers/persona';
import { freshStore, snap } from './helpers';

/** One sample call per command type. Adding a command without adding it here fails the completeness test. */
type Sample = (() => void) | { prep: () => void; run: () => void };
const SAMPLES: Record<string, Sample> = {
  'input.set': () => setInput('y1Ramp', 33), 'input.check': () => setChecked('hriEnabled', true),
  'artefact.setAgentSup': () => setAgentSup('A017', 90), 'artefact.setEffort': () => setEffort('A017', 9),
  'phase.setAgent': () => setPhaseAgent('V3', 95), 'artefacts.resetAgent': { prep: () => setAgentSup('A017', 10), run: () => resetAgent() },
  'artefacts.resetEffort': { prep: () => setEffort('A017', 1), run: () => resetEffort() },
  'scope.toggleArtefact': () => toggleArtefact('A017', false), 'scope.togglePhase': () => togglePhase('V4', false),
  'team.addRow': () => addTeamRow(), 'team.updateRow': () => updateTeamRow(0, 'loc', 'Poland'), 'team.removeRow': () => removeTeamRow(0),
  'case.setCustomerName': () => setCustomerName('Acme'), 'view.setPersona': () => setPersona('admin'),
  'lifecycle.setPos': () => setLifecyclePos(80), 'lifecycle.setUse': () => setLifecycleUse(false), 'lifecycle.setWeight': () => setLifecycleWeight('growth', 'V1', 2),
};

describe('command registry', () => {
  it('every registered command has a sample', () => expect(Object.keys(SAMPLES).sort()).toEqual([...COMMAND_REGISTRY.keys()].sort()));
  it.each(Object.keys(SAMPLES))('%s changes the document, has a label and round-trips through undo/redo', (type) => {
    const s = freshStore(), sample = SAMPLES[type]!;
    if (typeof sample !== 'function') sample.prep();
    const before = snap(s);
    (typeof sample === 'function' ? sample : sample.run)();
    const h = s.getState().history, last = h.undo[h.undo.length - 1];
    expect(snap(s)).not.toBe(before);
    if (!COMMAND_REGISTRY.get(type)!.undoable) { expect(last).toBeUndefined(); return; }   // view commands: applied, never on the undo stack
    expect(last!.label.length).toBeGreaterThan(3);
    const after = snap(s);
    expect(s.undo()).toBe(true);
    expect(snap(s)).toBe(before);
    expect(s.redo()).toBe(true);
    expect(snap(s)).toBe(after);
  });
});
