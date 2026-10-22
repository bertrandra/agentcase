/** @calc-zone stress */
import { ensureNs } from '@/domain/model/modelState';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { clampNum, parseInteger, parseNum } from './modelKit';

/** P4 stochastic layer settings and the counterfactual baseline drift (the draws themselves live in modelRun.ts, not in the case). */
type Val = { value: string | number };
const toggleCmd = defineCommand<{ on: boolean }>({
  type: 'model.mcs.enable', label: (p) => `${p.on ? 'Enable' : 'Disable'} P4 stochastic layer`,
  run(d, p) { d.MODEL.FLAGS.mcs = p.on; ensureNs(d.MODEL, 'MCS').enabled = p.on; },
});
const drawsCmd = defineCommand<Val>({
  type: 'model.mcs.setDraws', label: (p) => `Set draws to ${p.value}`, coalesceKey: () => 'model.mcs.setDraws',
  run(d, p) { ensureNs(d.MODEL, 'MCS').draws = clampNum(parseInteger(p.value, 2000), 100, 20000); },
});
const seedCmd = defineCommand<Val>({
  type: 'model.mcs.setSeed', label: (p) => `Set seed to ${p.value}`, coalesceKey: () => 'model.mcs.setSeed',
  run(d, p) { ensureNs(d.MODEL, 'MCS').seed = Math.max(1, parseInteger(p.value, 20260728)); },
});
const rhoCmd = defineCommand<Val>({
  type: 'model.mcs.setRho', label: (p) => `Set organisational correlation ρ to ${p.value}`, coalesceKey: () => 'model.mcs.setRho',
  run(d, p) { ensureNs(d.MODEL, 'MCS').rho = clampNum(parseNum(p.value, 0.35), 0, 1); },
});
/** Enabling with no drift seeds the typical 3 %/yr (legacy cbdToggleUi); typing 0 legitimately disables the phase. */
const cbdToggleCmd = defineCommand<Record<string, never>>({
  type: 'model.cbd.toggle', label: () => 'Toggle baseline drift',
  run(d) {
    if (d.MODEL.FLAGS.cbd) { d.MODEL.FLAGS.cbd = false; return; }
    if (!(d.MODEL.CBD.driftRate > 0)) d.MODEL.CBD.driftRate = 0.03;
    d.MODEL.FLAGS.cbd = true;
  },
});
const cbdDriftCmd = defineCommand<Val>({
  type: 'model.cbd.setDrift', label: (p) => `Set secular drift δ to ${p.value}`, coalesceKey: () => 'model.cbd.setDrift',
  run(d, p) { d.MODEL.CBD.driftRate = clampNum(parseNum(p.value, 0), 0, 1); d.MODEL.FLAGS.cbd = d.MODEL.CBD.driftRate > 0; },
});

export const enableMcs = (on: boolean): void => appStore().dispatch(toggleCmd({ on }));
export const setMcsDraws = (value: string | number): void => appStore().dispatch(drawsCmd({ value }));
export const setMcsSeed = (value: string | number): void => appStore().dispatch(seedCmd({ value }));
export const setMcsRho = (value: string | number): void => appStore().dispatch(rhoCmd({ value }));
export const toggleCbd = (): void => appStore().dispatch(cbdToggleCmd({}));
export const setCbdDrift = (value: string | number): void => appStore().dispatch(cbdDriftCmd({ value }));
