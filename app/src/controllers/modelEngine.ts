/** @calc-zone time-engine */
import { defineCommand } from '@/store/commands';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { clampNum, ensureLceBuilt, parseInteger, parseNum } from './modelKit';

/** P1 (loop convergence) and P2 (verification tax) controls. Every edit writes MODEL.* — display / engine state of the case, undoable. */

type Idx = { i: number; value: string | number };
const lceEnableCmd = defineCommand<{ on: boolean }>({
  type: 'model.lce.enable', label: (p) => `${p.on ? 'Enable' : 'Disable'} P1 loop convergence`,
  run(d, p) { d.MODEL.FLAGS.lce = p.on; if (p.on) ensureLceBuilt(d); },
});
const lceRecalibrateCmd = defineCommand<Record<string, never>>({
  type: 'model.lce.recalibrate', label: () => 'Recalibrate p from the legacy iteration counts',
  run(d) { d.MODEL.LCE.calibrated = false; d.MODEL.LCE.built = false; d.MODEL.LCE.loops = []; ensureLceBuilt(d); },
});
const lceSetPCmd = defineCommand<Idx>({
  type: 'model.lce.setP', label: (p) => `Set acceptance rate p of loop ${p.i + 1} to ${p.value}`, coalesceKey: (p) => `model.lce.setP:${p.i}`,
  run(d, p) {
    const x = parseFloat(String(p.value)), L = d.MODEL.LCE.loops[p.i];
    if (isNaN(x) || !L) return;
    L.pAccept = clampNum(x, 0.05, 1); d.MODEL.LCE.calibrated = true;
  },
});
const lceSetTRevCmd = defineCommand<Idx>({
  type: 'model.lce.setTRev', label: (p) => `Set review time of loop ${p.i + 1} to ${p.value} h`, coalesceKey: (p) => `model.lce.setTRev:${p.i}`,
  run(d, p) { const L = d.MODEL.LCE.loops[p.i]; if (L) L.tRev = clampNum(parseNum(p.value, 0), 0, 40); },
});
const lceSetNMaxCmd = defineCommand<{ value: string | number }>({
  type: 'model.lce.setNMax', label: (p) => `Set iteration cap nmax to ${p.value}`, coalesceKey: () => 'model.lce.setNMax',
  run(d, p) { ensureLceBuilt(d); d.MODEL.LCE.nMax = clampNum(parseInteger(p.value, 5), 1, 10); },
});
const lceSetFallbackCmd = defineCommand<{ value: string | number }>({
  type: 'model.lce.setFallback', label: (p) => `Set fallback cost per escape to ${p.value}`, coalesceKey: () => 'model.lce.setFallback',
  run(d, p) { ensureLceBuilt(d); d.MODEL.LCE.fallbackCost = Math.max(0, parseNum(p.value, 0)); },
});

export const enableLce = (on: boolean): void => appStore().dispatch(lceEnableCmd({ on }));
/** Re-solve p from the legacy counts; returns whether any p moved (the UI announces it). */
export function recalibrateLce(): boolean {
  const before = editBase().MODEL.LCE.loops.map((l) => l.pAccept);
  appStore().dispatch(lceRecalibrateCmd({}));
  const after = editBase().MODEL.LCE.loops.map((l) => l.pAccept);
  return before.length !== after.length || after.some((v, i) => before[i] == null || Math.abs(v - (before[i] as number)) > 1e-9);
}
export const setLceP = (i: number, value: string | number): void => appStore().dispatch(lceSetPCmd({ i, value }));
export const setLceTRev = (i: number, value: string | number): void => appStore().dispatch(lceSetTRevCmd({ i, value }));
export const setLceNMax = (value: string | number): void => appStore().dispatch(lceSetNMaxCmd({ value }));
export const setLceFallback = (value: string | number): void => appStore().dispatch(lceSetFallbackCmd({ value }));

type Cls = { cls: string; value: string | number };
const evtEnableCmd = defineCommand<{ on: boolean }>({
  type: 'model.evt.enable', label: (p) => `${p.on ? 'Enable' : 'Disable'} P2 verification tax`, run(d, p) { d.MODEL.FLAGS.evt = p.on; },
});
const evtModeCmd = defineCommand<{ mode: string }>({
  type: 'model.evt.setMode', label: (p) => `Set verification-tax mode to ${p.mode}`, run(d, p) { d.MODEL.EVT.mode = p.mode === 'net' ? 'net' : 'overlay'; },
});
const evtRSourceCmd = defineCommand<{ source: string }>({
  type: 'model.evt.setRSource', label: (p) => `Set reliability source to ${p.source}`,
  run(d, p) { d.MODEL.EVT.rSource = p.source === 'direct' ? 'direct' : 'fromLCE'; },
});
const evtRDirectCmd = defineCommand<{ value: string | number }>({
  type: 'model.evt.setRDirect', label: (p) => `Set direct reliability r to ${p.value}`, coalesceKey: () => 'model.evt.setRDirect',
  run(d, p) { d.MODEL.EVT.rDirect = clampNum(parseNum(p.value, 0.8), 0, 1); },
});
const evtAckCmd = defineCommand<{ on: boolean }>({
  type: 'model.evt.setAck', label: (p) => `${p.on ? 'Acknowledge' : 'Withdraw acknowledgement of'} the negative net tax`,
  run(d, p) { d.MODEL.EVT.ackNegativeNet = p.on; },
});
const tableCmd = (type: string, name: string, table: 'phiTable' | 'kappa' | 'gamma', lo: number, hi: number) => defineCommand<Cls>({
  type, label: (p) => `Set ${name} of class ${p.cls} to ${p.value}`, coalesceKey: (p) => `${type}:${p.cls}`,
  run(d, p) { const x = parseFloat(String(p.value)); if (!isNaN(x)) d.MODEL.EVT[table][p.cls] = clampNum(x, lo, hi); },
});
const evtPhiCmd = tableCmd('model.evt.setPhi', 'floor φ', 'phiTable', 0, 0.6);
const evtKappaCmd = tableCmd('model.evt.setKappa', 'intensity κ', 'kappa', 0, 2);
const evtGammaCmd = tableCmd('model.evt.setGamma', 'stiffness γ', 'gamma', 1, 4);

export const enableEvt = (on: boolean): void => appStore().dispatch(evtEnableCmd({ on }));
export const setEvtMode = (mode: string): void => appStore().dispatch(evtModeCmd({ mode }));
export const setEvtRSource = (source: string): void => appStore().dispatch(evtRSourceCmd({ source }));
export const setEvtRDirect = (value: string | number): void => appStore().dispatch(evtRDirectCmd({ value }));
export const setEvtAck = (on: boolean): void => appStore().dispatch(evtAckCmd({ on }));
export const setEvtPhi = (cls: string, value: string | number): void => appStore().dispatch(evtPhiCmd({ cls, value }));
export const setEvtKappa = (cls: string, value: string | number): void => appStore().dispatch(evtKappaCmd({ cls, value }));
export const setEvtGamma = (cls: string, value: string | number): void => appStore().dispatch(evtGammaCmd({ cls, value }));
