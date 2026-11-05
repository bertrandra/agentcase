/** @calc-zone scope-automation */
import { outOfSub, placeActivity, renameSubProcess, tidyAll, tidyPhase } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';

/**
 * Canvas commands of the owner's requests of 2026-11-05: several selected activities dropped in a cell in one step (each takes that phase and the
 * lane's role, leaving its sub-process), a phase's layout tidied (or every phase's), a sub-process renamed. Each is one undoable step.
 */
const placeManyCmd = defineCommand<{ ids: string[]; phase: string; lane?: string }>({
  type: 'process.placeActivities', label: (p) => `Move ${p.ids.length} activities to ${p.phase}${p.lane ? ` · ${p.lane}` : ''}`,
  run(d, p) { editProcess(d, (doc) => p.ids.reduce((acc, id) => placeActivity(outOfSub(acc, id), id, p.phase, p.lane), doc)); refitPotential(d); },
});
const tidyCmd = defineCommand<{ phase: string }>({
  type: 'process.tidyLayout', label: (p) => (p.phase ? `Tidy the layout of ${p.phase}` : 'Tidy the layout'),
  run(d, p) { editProcess(d, (doc) => (p.phase ? tidyPhase(doc, p.phase) : tidyAll(doc))); },
});
const renameCmd = defineCommand<{ sub: string; name: string }>({
  type: 'process.renameSubProcess', label: (p) => `Rename ${p.sub}`, run(d, p) { editProcess(d, (doc) => renameSubProcess(doc, p.sub, p.name)); },
});

export const placeProcessActivities = (ids: string[], phase: string, lane?: string): void => appStore().dispatch(placeManyCmd({ ids, phase, lane }));
/** `phase` '' tidies every phase. */
export const tidyProcessLayout = (phase = ''): void => appStore().dispatch(tidyCmd({ phase }));
export const renameProcessSub = (sub: string, name: string): void => appStore().dispatch(renameCmd({ sub, name }));
