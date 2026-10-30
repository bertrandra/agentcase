import { addProcessActivity, addProcessActor, addProcessPhase, removeProcessActivity, removeProcessActor, removeProcessPhase, reorderProcessPhases,
  setProcessScope, updateProcessActivity, updateProcessActor } from '@/controllers/process';
import type { Sample } from './types';

/** A custom activity (spec F-B18: phase, type, role, parameters). */
export const CUSTOM = {
  id: 'X100', name: 'Threat model review', phase: 'V2', value: 'VA', aiAuth: 'Copilot', humanSup: 60, agentSup: 40, effort: 3, seq: 2, skill: 'Arch',
  deliverable: 'Reviewed threat model', agentActivityType: 'Human', capability: 'Review', w: 3,
};

export const samples: Record<string, Sample> = {
  'process.setScope': () => setProcessScope(['A017', 'V2'], false),
  'process.updateActivity': () => updateProcessActivity('A017', { effort: 9, agentSup: 30, humanSup: 70 }),
  'process.addActivity': () => addProcessActivity(CUSTOM),
  'process.removeActivity': () => removeProcessActivity('A017'),
  'process.addActor': () => addProcessActor({ id: 'role-sre', name: 'SRE', kind: 'role', teamSkill: 'Ops/Run' }),
  'process.updateActor': () => updateProcessActor('role-dev', { teamSkill: 'Lead' }),
  'process.removeActor': {
    prep: () => addProcessActor({ id: 'agent-x', name: 'X agent', kind: 'agent', capability: 'X' }), run: () => removeProcessActor('agent-x'),
  },
  'process.addPhase': () => addProcessPhase('V8', 'Hypercare', 'Ops'),
  'process.removePhase': { prep: () => addProcessPhase('V8', 'Hypercare'), run: () => removeProcessPhase('V8') },
  'process.reorderPhases': () => reorderProcessPhases(['V1', 'L0']),
};
