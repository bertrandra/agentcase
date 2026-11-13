/** @calc-zone scope-automation */
import { addToSubProcess, createSubProcess, deleteSubProcess, subRefusal } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';

/**
 * The sub-processes of the diagram's canvas (owner's request 2026-11-04): create one from activities, drop an activity into one, delete one (its
 * activities stay, its links are given back). Each is one undoable step; a refused one adds none and says why. No figure reads a sub-process.
 */
const createCmd = defineCommand<{ ids: string[] }>({
  type: 'process.createSubProcess', label: (p) => `Create a sub-process of ${p.ids.join(', ')}`,
  run(d, p) { editProcess(d, (doc) => createSubProcess(doc, p.ids)); },
});
const addCmd = defineCommand<{ sub: string; ids: string[] }>({
  type: 'process.addToSubProcess', label: (p) => `Put ${p.ids.join(', ')} in ${p.sub}`,
  run(d, p) { editProcess(d, (doc) => p.ids.reduce((acc, id) => addToSubProcess(acc, p.sub, id), doc)); },
});
const deleteCmd = defineCommand<{ sub: string }>({
  type: 'process.deleteSubProcess', label: (p) => `Delete sub-process ${p.sub}`, run(d, p) { editProcess(d, (doc) => deleteSubProcess(doc, p.sub)); },
});

/** A sub-process of activities `ids` (one step); the reason when it cannot be made (no step). */
export function createProcessSub(ids: string[]): string | null {
  const why = subRefusal(editBase().BPMN, ids);
  if (!why) appStore().dispatch(createCmd({ ids }));
  return why;
}
/** Activities `ids` (of its phase, in no other sub-process) into sub-process `sub`, one step (owner, 2026-11-05); the reason when they cannot. */
export function addToProcessSub(sub: string, ...ids: string[]): string | null {
  const why = subRefusal(editBase().BPMN, ids, sub);
  if (!why) appStore().dispatch(addCmd({ sub, ids }));
  return why;
}
export const deleteProcessSub = (sub: string): void => appStore().dispatch(deleteCmd({ sub }));
