/** @calc-zone delivery-views */
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';
import { QUALITY_DEFAULT, type QualityRow } from '@/domain/verifyB';

/** The case's quality table, materialised from the defaults the first time it is edited. */
const table = (d: Doc): QualityRow[] => ((d as Record<string, unknown>).QUALITY ??= QUALITY_DEFAULT.map((r) => r.slice())) as QualityRow[];

const setQualityCmd = defineCommand<{ index: number; field: 'asis' | 'target'; value: number }>({
  type: 'quality.set', label: (p) => `Set quality ${p.field === 'asis' ? 'AS-IS' : 'target'} of row ${p.index + 1} to ${p.value}`, coalesceKey: (p) => `quality.set:${p.index}:${p.field}`,
  run(d, p) { const row = table(d)[p.index]; if (row) row[p.field === 'asis' ? 1 : 2] = p.value; },
});
const resetQualityCmd = defineCommand<Record<string, never>>({
  type: 'quality.reset', label: () => 'Reset the quality AS-IS baselines',
  run(d) { (d as Record<string, unknown>).QUALITY = QUALITY_DEFAULT.map((r) => r.slice()); },
});
const COEF_INPUT = { perfRelCap: 'veloPerfRelCap', perfUpliftFactor: 'veloPerfUpliftFactor' } as const;
export type PerfCoefKey = keyof typeof COEF_INPUT;
const setPerfCoefCmd = defineCommand<{ key: PerfCoefKey; text: string; value: number | null }>({
  type: 'coef.setPerf', label: (p) => `Set ${p.key} to ${p.text}`, coalesceKey: (p) => `coef.setPerf:${p.key}`,
  run(d, p) { d.dom.values[COEF_INPUT[p.key]] = p.text; if (p.value != null) d.COEF[p.key] = p.value; },
});

/** Edit the AS-IS baseline of a quality metric (legacy setQualityAsis: a non-number is ignored). */
export function setQualityAsis(index: number, raw: string | number): void { const n = parseFloat(String(raw)); if (!isNaN(n)) appStore().dispatch(setQualityCmd({ index, field: 'asis', value: n })); }
/** Edit the target of a quality metric (legacy setQualityTarget). */
export function setQualityTarget(index: number, raw: string | number): void { const n = parseFloat(String(raw)); if (!isNaN(n)) appStore().dispatch(setQualityCmd({ index, field: 'target', value: n })); }
export const resetQuality = (): void => appStore().dispatch(resetQualityCmd({}));
/** Edit a performance-realisation coefficient (legacy coefSet: the text is kept in the field, only a number reaches COEF). */
export function setPerfCoef(key: PerfCoefKey, text: string): void { const x = parseFloat(text); appStore().dispatch(setPerfCoefCmd({ key, text, value: isNaN(x) ? null : x })); }
