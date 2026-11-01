/** @calc-zone scope-automation */
import { PHASES, REG_ARTEFACTS, SDLC_ARTEFACTS, activeArtefacts, makeCtx } from '@/domain';
import type { Artefact } from '@/domain/types/catalog';
import { updateActivities, type ActivityPatch } from '@/domain/process';
import { currentOf } from '@/store/draftValue';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';
import type { Doc } from '@/store/types';

const isReg = (id: string) => id.startsWith('R');
const baseOf = (id: string): Artefact | undefined => (isReg(id) ? REG_ARTEFACTS : SDLC_ARTEFACTS).find((a) => a.id === id);

/**
 * The artefact editors write the activity's own parameters in the case's process document (`process.updateActivity`, spec § 9): one attribute
 * of `ac:supervision` / `ac:activity` per value, so an edit's undo patch is that attribute. Only catalogue artefacts are edited here (as before).
 */
const clamp01 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const auto = (n: number): ActivityPatch => ({ agentSup: n, humanSup: 100 - n });
const edit = (d: Doc, patches: Map<string, ActivityPatch>): void => {
  for (const id of [...patches.keys()]) if (!baseOf(id)) patches.delete(id);
  editProcess(d, (doc) => updateActivities(doc, patches));
};

const setAgentSupCmd = defineCommand<{ id: string; value: number }>({
  type: 'artefact.setAgentSup', label: (p) => `Set ${p.id} to ${clamp01(p.value)} % auto`, coalesceKey: (p) => `artefact.setAgentSup:${p.id}`,
  run(d, p) { edit(d, new Map([[p.id, auto(clamp01(p.value))]])); refitPotential(d); },
});
const setEffortCmd = defineCommand<{ id: string; value: number }>({
  type: 'artefact.setEffort', label: (p) => `Set ${p.id} effort to ${p.value}`, coalesceKey: (p) => `artefact.setEffort:${p.id}`,
  run(d, p) { edit(d, new Map([[p.id, { effort: isNaN(p.value) || p.value < 0 ? 0 : p.value }]])); },
});
const setPhaseAgentCmd = defineCommand<{ phase: string; value: number }>({
  type: 'phase.setAgent', label: (p) => `Set every artefact of ${p.phase} to ${clamp01(p.value)} % auto`,
  run(d, p) {
    const ids = activeArtefacts(makeCtx(currentOf(d) as Doc).a, currentOf(d) as Doc).filter((a) => a.phase === p.phase).map((a) => a.id);
    edit(d, new Map(ids.map((id) => [id, auto(clamp01(p.value))])));
    refitPotential(d);
  },
});
const resetAgentCmd = defineCommand<Record<string, never>>({
  type: 'artefacts.resetAgent', label: () => 'Reset % auto to defaults',
  run(d) { edit(d, new Map([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => [a.id, auto(a.agentSup)]))); refitPotential(d); },
});
const resetEffortCmd = defineCommand<Record<string, never>>({
  type: 'artefacts.resetEffort', label: () => 'Reset effort weights to defaults',
  run(d) { edit(d, new Map([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => [a.id, { effort: a.effort }]))); },
});

export const setAgentSup = (id: string, value: number | string): void => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!isNaN(n)) appStore().dispatch(setAgentSupCmd({ id, value: n }));
};
export const setEffort = (id: string, value: number | string): void => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  appStore().dispatch(setEffortCmd({ id, value: n }));
};
export const setPhaseAgent = (phase: string, value: number | string): void => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!isNaN(n) && PHASES.some((p) => p.id === phase || phase === 'Cross-cutting')) appStore().dispatch(setPhaseAgentCmd({ phase, value: n }));
};
export const resetAgent = (): void => appStore().dispatch(resetAgentCmd({}));
export const resetEffort = (): void => appStore().dispatch(resetEffortCmd({}));
