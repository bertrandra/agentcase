/** @calc-zone scope-automation */
import { PHASES, REG_ARTEFACTS, SDLC_ARTEFACTS, activeArtefacts, makeCtx } from '@/domain';
import type { Artefact } from '@/domain/types/catalog';
import type { ArtefactEdit } from '@/domain/types/state';
import { current } from 'immer';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

const isReg = (id: string) => id.startsWith('R');
const listOf = (d: Doc, id: string) => (isReg(id) ? (d.regArtefactsEdited ??= []) : (d.artefactsEdited ??= []));
const baseOf = (id: string): Artefact | undefined => (isReg(id) ? REG_ARTEFACTS : SDLC_ARTEFACTS).find((a) => a.id === id);

/** Get-or-create the edit record of an artefact on the draft. */
function editOf(d: Doc, id: string): ArtefactEdit | undefined {
  const list = listOf(d, id);
  let e = list.find((x) => x.id === id);
  if (!e) {
    const b = baseOf(id); if (!b) return undefined;
    e = { id, agentSup: b.agentSup, humanSup: b.humanSup, effort: b.effort };
    list.push(e);
    e = list[list.length - 1] as ArtefactEdit;
  }
  return e;
}
const clamp01 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
function setAuto(d: Doc, id: string, n: number) { const e = editOf(d, id); if (e) { e.agentSup = n; e.humanSup = 100 - n; } }

const setAgentSupCmd = defineCommand<{ id: string; value: number }>({
  type: 'artefact.setAgentSup', label: (p) => `Set ${p.id} to ${clamp01(p.value)} % auto`, coalesceKey: (p) => `artefact.setAgentSup:${p.id}`,
  run(d, p) { setAuto(d, p.id, clamp01(p.value)); refitPotential(d); },
});
const setEffortCmd = defineCommand<{ id: string; value: number }>({
  type: 'artefact.setEffort', label: (p) => `Set ${p.id} effort to ${p.value}`, coalesceKey: (p) => `artefact.setEffort:${p.id}`,
  run(d, p) { const e = editOf(d, p.id); if (e) e.effort = isNaN(p.value) || p.value < 0 ? 0 : p.value; },
});
const setPhaseAgentCmd = defineCommand<{ phase: string; value: number }>({
  type: 'phase.setAgent', label: (p) => `Set every artefact of ${p.phase} to ${clamp01(p.value)} % auto`,
  run(d, p) {
    const ids = activeArtefacts(makeCtx(current(d) as Doc).a, current(d) as Doc).filter((a) => a.phase === p.phase).map((a) => a.id);
    ids.forEach((id) => setAuto(d, id, clamp01(p.value)));
    refitPotential(d);
  },
});
const resetAgentCmd = defineCommand<Record<string, never>>({
  type: 'artefacts.resetAgent', label: () => 'Reset % auto to defaults',
  run(d) { [...SDLC_ARTEFACTS, ...REG_ARTEFACTS].forEach((a) => setAuto(d, a.id, a.agentSup)); refitPotential(d); },
});
const resetEffortCmd = defineCommand<Record<string, never>>({
  type: 'artefacts.resetEffort', label: () => 'Reset effort weights to defaults',
  run(d) { [...SDLC_ARTEFACTS, ...REG_ARTEFACTS].forEach((a) => { const e = editOf(d, a.id); if (e) e.effort = a.effort; }); },
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
