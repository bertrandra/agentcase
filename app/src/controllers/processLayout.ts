/** @calc-zone scope-automation */
import { moveActivity, setDiagram, setReworkFlow, type Bounds, type ReworkPatch } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
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

export const moveProcessActivity = (id: string, phase: string): void => appStore().dispatch(moveCmd({ id, phase }));
export const setProcessRework = (flow: string, patch: ReworkPatch): void => appStore().dispatch(reworkCmd({ flow, patch }));
export const setProcessDiagram = (element: string, bounds: Bounds): void => appStore().dispatch(diagramCmd({ element, bounds }));
