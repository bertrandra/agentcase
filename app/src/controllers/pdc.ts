/** @calc-zone workspace-config */
import { current } from 'immer';
import { makeCtx } from '@/domain';
import type { DdState, DdStatus } from '@/domain/pdc/dd';
import { computeDdSensitivity } from '@/domain/pdc/ddSens';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

// ---- Assumptions register -----------------------------------------------------------------------------------------------
const assumptOkCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'pdc.setAssumptValidated', label: (p) => `${p.on ? 'Mark' : 'Unmark'} ${p.id} as validated with the client`,
  run(d, p) {
    const ok = { ...((d.assumptValidated as Record<string, boolean> | undefined) ?? {}) };
    if (p.on) ok[p.id] = true; else delete ok[p.id];
    d.assumptValidated = ok;
  },
});
export const setAssumptValidated = (id: string, on: boolean): void => appStore().dispatch(assumptOkCmd({ id, on }));

// ---- Due diligence ------------------------------------------------------------------------------------------------------
const num = (v: string | number): number => (typeof v === 'number' ? v : parseFloat(v));
type Anchor = { id: string; asis: number; target: number };
const ddStateCmd = defineCommand<{ id: string; st: DdStatus }>({
  type: 'pdc.setDdState', label: (p) => `Mark ${p.id} as ${p.st} in the due-diligence register`,
  run(d, p) { const all = (d.DD_STATE ??= {}) as DdState; all[p.id] = { ...all[p.id], st: p.st }; },
});
const coefCmd = defineCommand<{ key: string; value: number }>({
  type: 'pdc.setCoef', label: (p) => `Set the coefficient ${p.key} to ${p.value}`, coalesceKey: (p) => `pdc.setCoef:${p.key}`,
  run(d, p) { if (p.key in d.COEF && !isNaN(p.value)) d.COEF[p.key] = p.value; },
});
const anchorCmd = defineCommand<{ list: 'DORA_ANCHORS' | 'THROUGHPUT_ANCHORS'; id: string; which: 'asis' | 'target'; value: number }>({
  type: 'pdc.setAnchor', label: (p) => `Set the ${p.which === 'asis' ? 'as-is' : 'target'} of the anchor ${p.id} to ${p.value}`, coalesceKey: (p) => `pdc.setAnchor:${p.id}:${p.which}`,
  run(d, p) { const a = (d[p.list] as Anchor[] | undefined)?.find((x) => x.id === p.id); if (a && !isNaN(p.value)) a[p.which] = p.value; },
});
const qualityCmd = defineCommand<{ index: number; col: 1 | 2; value: number }>({
  type: 'pdc.setQuality', label: (p) => `Set the ${p.col === 1 ? 'as-is' : 'target'} of quality metric ${p.index + 1} to ${p.value}`, coalesceKey: (p) => `pdc.setQuality:${p.index}:${p.col}`,
  run(d, p) { const q = (d.QUALITY as (string | number)[][] | undefined)?.[p.index]; if (q && !isNaN(p.value)) q[p.col] = p.value; },
});
const fgCmd = defineCommand<{ key: string; value: number }>({
  type: 'pdc.setFgParam', label: (p) => `Set the factory parameter ${p.key} to ${p.value}`, coalesceKey: (p) => `pdc.setFgParam:${p.key}`,
  run(d, p) { const f = d.FG_PARAMS as Record<string, number> | undefined; if (f && p.key in f && !isNaN(p.value)) f[p.key] = p.value; },
});
/** Measured on the case the command runs on (the draft): the common case when the common values are edited, never another product's. */
const sensCmd = defineCommand<Record<string, never>>({
  type: 'pdc.setDdSensitivity', label: () => 'Measure the € sensitivity of the due-diligence register', run(d) { d.DD_SENS = computeDdSensitivity(makeCtx(current(d) as Doc)); },
});
export const setDdState = (id: string, st: DdStatus): void => appStore().dispatch(ddStateCmd({ id, st }));
export const setCoef = (key: string, value: string | number): void => appStore().dispatch(coefCmd({ key, value: num(value) }));
export const setAnchor = (list: 'DORA_ANCHORS' | 'THROUGHPUT_ANCHORS', id: string, which: 'asis' | 'target', value: string | number): void => appStore().dispatch(anchorCmd({ list, id, which, value: num(value) }));
export const setQualityAnchor = (index: number, col: 1 | 2, value: string | number): void => appStore().dispatch(qualityCmd({ index, col, value: num(value) }));
export const setFgParam = (key: string, value: string | number): void => appStore().dispatch(fgCmd({ key, value: num(value) }));
/** Run the ~50 one-at-a-time model evaluations on the current case and store the result (cached until an input changes). */
export const computeSensitivity = (): void => appStore().dispatch(sensCmd({}));
