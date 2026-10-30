/** @calc-zone scope-automation */
import { addActivity, addActor, addPhase, removeActivity, removeActor, removePhase, reorderPhases, setScope, updateActivity, updateActor,
  type ActivityPatch, type ActorInput, type CatArtefact } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';

/**
 * The process commands (docs/SPEC_BPMN.md § 9, phase B3): each one edits the case's process document (node tree) in place, so its undo patch is
 * the nodes that changed. The legacy scope commands (`controllers/scope.ts`, `frame.ts`, `artefacts.ts`, `verifyA.ts`) are written through the same
 * domain edits (`withScope`, `updateActivities`). Refused edits (unknown or used id, an actor still referenced, a phase that holds activities) leave
 * the document as it is and add no undo step. The Process section (phase B4) is their first screen; until then only tests and the API call them.
 */
type NewActivity = CatArtefact & { regulatory?: boolean; inScope?: boolean };

const setScopeCmd = defineCommand<{ ids: string[]; on: boolean }>({
  type: 'process.setScope',
  label: (p) => `${p.on ? 'Include' : 'Exclude'} ${p.ids.length === 1 ? p.ids[0] : `${p.ids.length} elements`} ${p.on ? 'in' : 'from'} the scope`,
  run(d, p) { editProcess(d, (doc) => setScope(doc, p.ids, p.on)); refitPotential(d); },
});
const updateActivityCmd = defineCommand<{ id: string; patch: ActivityPatch }>({
  type: 'process.updateActivity', label: (p) => `Edit activity ${p.id}`,
  coalesceKey: (p) => `process.updateActivity:${p.id}:${Object.keys(p.patch).sort().join(',')}`,
  run(d, p) { editProcess(d, (doc) => updateActivity(doc, p.id, p.patch)); refitPotential(d); },
});
const addActivityCmd = defineCommand<{ activity: NewActivity }>({
  type: 'process.addActivity', label: (p) => `Add activity ${p.activity.name || p.activity.id}`,
  run(d, p) { editProcess(d, (doc) => addActivity(doc, p.activity)); refitPotential(d); },
});
const removeActivityCmd = defineCommand<{ id: string }>({
  type: 'process.removeActivity', label: (p) => `Remove activity ${p.id}`,
  run(d, p) { editProcess(d, (doc) => removeActivity(doc, p.id)); refitPotential(d); },
});
const addActorCmd = defineCommand<{ actor: ActorInput }>({
  type: 'process.addActor', label: (p) => `Add ${p.actor.kind} ${p.actor.name}`, run(d, p) { editProcess(d, (doc) => addActor(doc, p.actor)); },
});
const updateActorCmd = defineCommand<{ id: string; patch: { name?: string; teamSkill?: string | null; capability?: string | null } }>({
  type: 'process.updateActor', label: (p) => `Edit actor ${p.id}`, coalesceKey: (p) => `process.updateActor:${p.id}`,
  run(d, p) { editProcess(d, (doc) => updateActor(doc, p.id, p.patch)); },
});
const removeActorCmd = defineCommand<{ id: string }>({
  type: 'process.removeActor', label: (p) => `Remove actor ${p.id}`, run(d, p) { editProcess(d, (doc) => removeActor(doc, p.id)); },
});
const addPhaseCmd = defineCommand<{ id: string; name: string; role?: string }>({
  type: 'process.addPhase', label: (p) => `Add phase ${p.name}`, run(d, p) { editProcess(d, (doc) => addPhase(doc, p)); },
});
const removePhaseCmd = defineCommand<{ id: string }>({
  type: 'process.removePhase', label: (p) => `Remove phase ${p.id}`, run(d, p) { editProcess(d, (doc) => removePhase(doc, p.id)); },
});
const reorderPhasesCmd = defineCommand<{ ids: string[] }>({
  type: 'process.reorderPhases', label: () => 'Reorder the phases', run(d, p) { editProcess(d, (doc) => reorderPhases(doc, p.ids)); },
});

export const setProcessScope = (ids: string[], on: boolean): void => appStore().dispatch(setScopeCmd({ ids, on }));
export const updateProcessActivity = (id: string, patch: ActivityPatch): void => appStore().dispatch(updateActivityCmd({ id, patch }));
export const addProcessActivity = (activity: NewActivity): void => appStore().dispatch(addActivityCmd({ activity }));
export const removeProcessActivity = (id: string): void => appStore().dispatch(removeActivityCmd({ id }));
export const addProcessActor = (actor: ActorInput): void => appStore().dispatch(addActorCmd({ actor }));
export const updateProcessActor = (id: string, patch: { name?: string; teamSkill?: string | null; capability?: string | null }): void =>
  appStore().dispatch(updateActorCmd({ id, patch }));
export const removeProcessActor = (id: string): void => appStore().dispatch(removeActorCmd({ id }));
export const addProcessPhase = (id: string, name: string, role?: string): void => appStore().dispatch(addPhaseCmd({ id, name, role }));
export const removeProcessPhase = (id: string): void => appStore().dispatch(removePhaseCmd({ id }));
export const reorderProcessPhases = (ids: string[]): void => appStore().dispatch(reorderPhasesCmd({ ids }));
