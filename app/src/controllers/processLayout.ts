/** @calc-zone scope-automation */
import { addActivityAt, changeActivityRole, linkActivities, newCanvasActivity, readProcess, moveActivity, placeActivity, setDiagram, setReworkFlow,
  type Bounds, type CatArtefact,
  type ReworkPatch } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';

/**
 * Process commands of phase B4 on structure and diagram (docs/SPEC_BPMN.md § 9): move an activity to another phase, the parameters of a rework
 * flow, the position of an element on the diagram (coalesced per element, like a drag). Refused edits add no undo step.
 */
const moveCmd = defineCommand<{ id: string; phase: string }>({
  type: 'process.moveActivity', label: (p) => `Move activity ${p.id} to phase ${p.phase}`,
  run(d, p) { editProcess(d, (doc) => moveActivity(doc, p.id, p.phase)); refitPotential(d); },
});
const reworkCmd = defineCommand<{ flow: string; patch: ReworkPatch }>({
  type: 'process.setReworkFlow', label: (p) => `Edit rework flow ${p.flow}`, coalesceKey: (p) => `process.setReworkFlow:${p.flow}`,
  run(d, p) { editProcess(d, (doc) => setReworkFlow(doc, p.flow, p.patch)); },
});
const diagramCmd = defineCommand<{ element: string; bounds: Bounds }>({
  type: 'process.setDiagram', label: (p) => `Move ${p.element} on the diagram`, coalesceKey: (p) => `process.setDiagram:${p.element}`,
  run(d, p) { editProcess(d, (doc) => setDiagram(doc, p.element, p.bounds)); },
});

// the canvas (owner, 2026-11-04): a dropped activity (phase, role of the lane, slot), a role chosen in the panel, an activity added with "+"
const placeCmd = defineCommand<{ id: string; phase: string; lane?: string }>({
  type: 'process.placeActivity', label: (p) => `Move activity ${p.id} to ${p.phase}${p.lane ? ` · ${p.lane}` : ''}`,
  run(d, p) { editProcess(d, (doc) => placeActivity(doc, p.id, p.phase, p.lane)); refitPotential(d); },
});
const roleCmd = defineCommand<{ id: string; role: string }>({
  type: 'process.setActivityRole', label: (p) => `Set the role of ${p.id}`,
  run(d, p) { editProcess(d, (doc) => changeActivityRole(doc, p.id, p.role)); refitPotential(d); },
});
const addAtCmd = defineCommand<{ activity: CatArtefact; lane?: string }>({
  type: 'process.addActivityAt', label: (p) => `Add activity ${p.activity.name || p.activity.id}`,
  run(d, p) { editProcess(d, (doc) => addActivityAt(doc, p.activity, p.lane)); refitPotential(d); },
});

const linkCmd = defineCommand<Record<string, never>>({
  type: 'process.linkActivities', label: () => 'Link the activities of each phase',
  run(d) { editProcess(d, linkActivities); },
});

export const moveProcessActivity = (id: string, phase: string): void => appStore().dispatch(moveCmd({ id, phase }));
export const setProcessRework = (flow: string, patch: ReworkPatch): void => appStore().dispatch(reworkCmd({ flow, patch }));
export const setProcessDiagram = (element: string, bounds: Bounds): void => appStore().dispatch(diagramCmd({ element, bounds }));
/** Links the activities of every phase that has no link yet (FX-D9); false (and no undo step) when every phase is already linked. */
export const linkProcessActivities = (): boolean => {
  const doc = editBase().BPMN;
  if (linkActivities(doc) === doc) return false;
  appStore().dispatch(linkCmd({}));
  return true;
};
export const placeProcessActivity = (id: string, phase: string, lane?: string): void => appStore().dispatch(placeCmd({ id, phase, lane }));
export const setProcessActivityRole = (id: string, role: string): void => appStore().dispatch(roleCmd({ id, role }));
export const addProcessActivityAt = (activity: CatArtefact, lane?: string): void => appStore().dispatch(addAtCmd({ activity, lane }));
/** The canvas "+": a new activity in `phase` (else the first phase), in its role's lane; its id, or null when the process has no phase. */
export function addCanvasActivity(phase?: string): string | null {
  const doc = editBase().BPMN, ph = phase || readProcess(doc).phases.find((p) => p.id !== 'Cross-cutting')?.id, a = ph ? newCanvasActivity(doc, ph) : null;
  if (!a) return null;
  addProcessActivityAt(a);
  return a.id;
}
