import { setAgentSup, setEffort, setPhaseAgent, resetAgent, resetEffort } from '@/controllers/artefacts';
import { setChecked, setInput } from '@/controllers/inputs';
import { setLifecyclePos, setLifecycleUse, setLifecycleWeight } from '@/controllers/lifecycle';
import { setCustomerName, setPersona } from '@/controllers/persona';
import { toggleArtefact, togglePhase } from '@/controllers/scope';
import { addTeamRow, removeTeamRow, updateTeamRow } from '@/controllers/team';
import type { Sample } from './types';

/** One sample call per command type (Phase 3 controllers). */
export const samples: Record<string, Sample> = {
  'input.set': () => setInput('y1Ramp', 33), 'input.check': () => setChecked('hriEnabled', true),
  'artefact.setAgentSup': () => setAgentSup('A017', 90), 'artefact.setEffort': () => setEffort('A017', 9),
  'phase.setAgent': () => setPhaseAgent('V3', 95), 'artefacts.resetAgent': { prep: () => setAgentSup('A017', 10), run: () => resetAgent() },
  'artefacts.resetEffort': { prep: () => setEffort('A017', 1), run: () => resetEffort() },
  'scope.toggleArtefact': () => toggleArtefact('A017', false), 'scope.togglePhase': () => togglePhase('V4', false),
  'team.addRow': () => addTeamRow(), 'team.updateRow': () => updateTeamRow(0, 'loc', 'Poland'), 'team.removeRow': () => removeTeamRow(0),
  'case.setCustomerName': () => setCustomerName('Acme'), 'view.setPersona': () => setPersona('admin'),
  'lifecycle.setPos': () => setLifecyclePos(80), 'lifecycle.setUse': () => setLifecycleUse(false),
  'lifecycle.setWeight': () => setLifecycleWeight('growth', 'V1', 2),
};
