import { MATURITY_DEFAULTS, blankReadiness, type MaturityMap, type ReadinessAns } from '@/domain/tune';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

// ---- MATURITY_MAP: the single definition of the L1–L4 thresholds (read by the engine, charts and every maturity read-out) ----
const mapOf = (d: Doc): MaturityMap => ((d as { MATURITY_MAP?: unknown }).MATURITY_MAP ??= structuredClone(MATURITY_DEFAULTS)) as MaturityMap;

const setBoundCmd = defineCommand<{ kind: 'ramp' | 'share'; idx: number; value: number }>({
  type: 'maturity.setBound', label: (p) => `Set ${p.kind === 'share' ? 'agent-share' : 'adoption'} threshold of L${p.idx + 1} to ${p.value}%`,
  coalesceKey: (p) => `maturity.setBound:${p.kind}:${p.idx}`,
  run(d, p) {
    const n = Math.max(0, Math.min(100, Math.round(p.value))), mm = mapOf(d), arr = p.kind === 'share' ? mm.shareBounds : mm.rampBounds;
    arr[p.idx] = n;
    for (let i = 1; i < arr.length; i++) if ((arr[i] as number) < (arr[i - 1] as number)) arr[i] = arr[i - 1] as number;   // keep non-decreasing
  },
});
const setLabelCmd = defineCommand<{ idx: number; value: string }>({
  type: 'maturity.setLabel', label: (p) => `Rename maturity level L${p.idx + 1}`, coalesceKey: (p) => `maturity.setLabel:${p.idx}`,
  run(d, p) { const mm = mapOf(d); if (mm.labels) mm.labels[p.idx] = p.value; },
});
const resetMapCmd = defineCommand<Record<string, never>>({
  type: 'maturity.reset', label: () => 'Reset the maturity thresholds to their defaults',
  run(d) {
    const mm = mapOf(d);
    mm.rampBounds = [...MATURITY_DEFAULTS.rampBounds]; mm.shareBounds = [...MATURITY_DEFAULTS.shareBounds]; mm.labels = [...MATURITY_DEFAULTS.labels];
  },
});

/** Edit a lower bound (%) of level L(idx+1); a NaN is ignored, values are rounded, clamped to 0–100 and kept non-decreasing. */
export const setMaturityBound = (kind: 'ramp' | 'share', idx: number, value: string | number): void => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!isNaN(n) && idx >= 1 && idx <= 3) appStore().dispatch(setBoundCmd({ kind, idx, value: n }));
};
export const setMaturityLabel = (idx: number, value: string): void => appStore().dispatch(setLabelCmd({ idx, value }));
export const resetMaturityMap = (): void => appStore().dispatch(resetMapCmd({}));

// ---- AI Readiness questionnaire (readinessAns: dimension -> three answers null | 0 | 50 | 100) ----
const ansOf = (d: Doc): ReadinessAns => ((d as { readinessAns?: unknown }).readinessAns ??= blankReadiness()) as ReadinessAns;

const setAnswerCmd = defineCommand<{ dim: string; qi: number; value: number | null }>({
  type: 'readiness.set', label: (p) => `Answer readiness statement ${p.dim} ${p.qi + 1}`, coalesceKey: (p) => `readiness.set:${p.dim}:${p.qi}`,
  run(d, p) { const a = ansOf(d); (a[p.dim] ??= [null, null, null])[p.qi] = p.value; },
});
const setAllCmd = defineCommand<{ value: number | null }>({
  type: 'readiness.setAll', label: (p) => (p.value == null ? 'Reset the readiness questionnaire' : `Answer every readiness statement ${p.value}`),
  run(d, p) { const a = ansOf(d); for (const k of Object.keys(blankReadiness())) a[k] = [p.value, p.value, p.value]; },
});
/** '' clears the answer (—), otherwise 0 / 50 / 100. */
export const setReadiness = (dim: string, qi: number, value: string): void => {
  const v = value === '' ? null : parseInt(value, 10);
  appStore().dispatch(setAnswerCmd({ dim, qi, value: v != null && isNaN(v) ? null : v }));
};
export const setAllReadiness = (value: number | null): void => appStore().dispatch(setAllCmd({ value }));

// ---- COEF editable from several surfaces (legacy coefSet): the coefficient and the input that shows it move together ----
export type CoefKey = 'hriFloor' | 'hriSlope' | 'vtaxCap';
const setCoefCmd = defineCommand<{ key: CoefKey; id: string; value: number; text: string }>({
  type: 'tuneA.coefSet', label: (p) => `Set coefficient ${p.key} to ${p.text}`, coalesceKey: (p) => `tuneA.coefSet:${p.key}`,
  run(d, p) { d.COEF[p.key] = p.value; d.dom.values[p.id] = p.text; },
});
/** Legacy coefSet(): a value that does not parse is ignored. */
export const setCoef = (key: CoefKey, id: string, text: string): void => {
  const v = parseFloat(text);
  if (!isNaN(v)) appStore().dispatch(setCoefCmd({ key, id, value: v, text }));
};
