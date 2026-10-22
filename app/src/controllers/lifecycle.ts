/** @calc-zone scope-automation */
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';

const setPosCmd = defineCommand<{ pos: number }>({
  type: 'lifecycle.setPos', label: (p) => `Set product status position to ${p.pos}`, coalesceKey: () => 'lifecycle.setPos',
  run(d, p) { d.lifecyclePos = Math.max(0, Math.min(100, +p.pos || 0)); },
});
const setUseCmd = defineCommand<{ on: boolean }>({
  type: 'lifecycle.setUse', label: (p) => `${p.on ? 'Enable' : 'Disable'} the product-status axis`, run(d, p) { d.lifecycleUse = p.on; },
});
const setWeightCmd = defineCommand<{ status: string; phase: string; weight: number }>({
  type: 'lifecycle.setWeight', label: (p) => `Set ${p.status} weight of ${p.phase} to ${p.weight}`, coalesceKey: (p) => `lifecycle.setWeight:${p.status}:${p.phase}`,
  run(d, p) {
    const s = d.statusLifecycle.find((x) => x.id === p.status); if (!s) return;
    s.weights = { ...(s.weights ?? {}), [p.phase]: Math.max(0, p.weight) };
  },
});

export const setLifecyclePos = (pos: number): void => appStore().dispatch(setPosCmd({ pos }));
export const setLifecycleUse = (on: boolean): void => appStore().dispatch(setUseCmd({ on }));
export const setLifecycleWeight = (status: string, phase: string, weight: number): void => appStore().dispatch(setWeightCmd({ status, phase, weight }));
