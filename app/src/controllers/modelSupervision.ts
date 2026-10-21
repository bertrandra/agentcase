import { supSeedHeadcount } from '@/domain/model/supView';
import { ensureNs } from '@/domain/model/modelState';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';
import { clampNum, ctxOfDraft, parseNum } from './modelKit';

/** P3 (supervision: provisioned or constrained) and the DORA measured values. */

/** Switching into Constrained with no headcount seeds the non-binding boundary (today's requirement), like legacy supEnsureSeeded(). */
function ensureSeeded(d: Doc): void {
  const sup = d.MODEL.SUP;
  if (sup.provision === 'constrained' && !(sup.supervisors > 0)) sup.supervisors = supSeedHeadcount(ctxOfDraft(d));
}
type Val = { value: string | number };
const toggleCmd = defineCommand<{ on: boolean }>({
  type: 'model.sup.enable', label: (p) => `${p.on ? 'Enable' : 'Disable'} P3 supervision`,
  run(d, p) { d.MODEL.FLAGS.sup = p.on; if (p.on) ensureSeeded(d); },
});
const provisionCmd = defineCommand<{ provision: string }>({
  type: 'model.sup.setProvision', label: (p) => `Supervision mode: ${p.provision}`,
  run(d, p) { d.MODEL.SUP.provision = p.provision === 'constrained' ? 'constrained' : 'provisioned'; ensureSeeded(d); },
});
const modeCmd = defineCommand<{ mode: string }>({
  type: 'model.sup.setMode', label: (p) => `Set the capacity cap to ${p.mode}`, run(d, p) { d.MODEL.SUP.mode = p.mode === 'soft' ? 'soft' : 'hard'; },
});
const numCmd = (type: string, name: string, key: 'supervisors' | 'supervisorCost' | 'rampRate' | 'rampCap', dflt: number, lo: number, hi: number) =>
  defineCommand<Val>({
    type, label: (p) => `Set ${name} to ${p.value}`, coalesceKey: () => type,
    run(d, p) { d.MODEL.SUP[key] = clampNum(parseNum(p.value, dflt), lo, hi); },
  });
const supervisorsCmd = numCmd('model.sup.setSupervisors', 'supervisors (FTE)', 'supervisors', 0, 0, 500);
const costCmd = numCmd('model.sup.setSupervisorCost', 'supervisor day rate', 'supervisorCost', 0, 0, 400000);
const rampRateCmd = numCmd('model.sup.setRampRate', 'supervisor ramp λ', 'rampRate', 0, 0, 0.5);
const rampCapCmd = numCmd('model.sup.setRampCap', 'supervisor ramp cap', 'rampCap', 2.5, 1, 4);
const doraCmd = defineCommand<{ key: string } & Val>({
  type: 'model.dora.setMeasured', label: (p) => `Set measured ${p.key} to ${p.value}`, coalesceKey: (p) => `model.dora.setMeasured:${p.key}`,
  run(d, p) { const x = parseFloat(String(p.value)); ensureNs(d.MODEL, 'DORA').measured[p.key] = isNaN(x) ? null : x; },
});

export const enableSup = (on: boolean): void => appStore().dispatch(toggleCmd({ on }));
export const setSupProvision = (provision: string): void => appStore().dispatch(provisionCmd({ provision }));
export const setSupMode = (mode: string): void => appStore().dispatch(modeCmd({ mode }));
export const setSupervisors = (value: string | number): void => appStore().dispatch(supervisorsCmd({ value }));
export const setSupervisorCost = (value: string | number): void => appStore().dispatch(costCmd({ value }));
export const setSupRampRate = (value: string | number): void => appStore().dispatch(rampRateCmd({ value }));
export const setSupRampCap = (value: string | number): void => appStore().dispatch(rampCapCmd({ value }));
export const setDoraMeasured = (key: string, value: string | number): void => appStore().dispatch(doraCmd({ key, value }));
