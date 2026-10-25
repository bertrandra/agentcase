/** @calc-zone delivery-views */
import type { CaseState } from '../types/state';

/** DORA anchor: the AS-IS value and the elite target a metric interpolates between (legacy DORA_ANCHORS). */
export interface DoraAnchor { id: string; label: string; asis: number; target: number; fmt: 'wk' | 'd' | 'h' | 'p' | 'n'; dir: 'up' | 'down' }
/** Throughput category: artefacts per engineer per month, mapped to a representative lifecycle phase. */
export interface ThroughputAnchor { id: string; label: string; asis: number; target: number; phase: string }
/** Quality row: [metric, AS-IS, target, source]. */
export type QualityRow = [string, number, number, string];

export const DORA_DEFAULT: DoraAnchor[] = [
  { id: 'deployFreq', label: 'Deploy frequency', asis: 0.75, target: 14, fmt: 'wk', dir: 'up' },
  { id: 'leadTime', label: 'Lead time', asis: 21, target: 1, fmt: 'd', dir: 'down' },
  { id: 'mttr', label: 'MTTR', asis: 5, target: 0.75, fmt: 'h', dir: 'down' },
  { id: 'changeFail', label: 'Change failure', asis: 17, target: 4, fmt: 'p', dir: 'down' },
  { id: 'velocitySp', label: 'Velocity (SP/sprint)', asis: 35, target: 59, fmt: 'n', dir: 'up' },
];
export const THROUGHPUT_DEFAULT: ThroughputAnchor[] = [
  { id: 'userStories', label: 'User stories', asis: 8, target: 24, phase: 'V1' },
  { id: 'apiSpecs', label: 'API specs', asis: 3, target: 10, phase: 'V2' },
  { id: 'testCases', label: 'Test cases', asis: 45, target: 150, phase: 'V4' },
  { id: 'codeModules', label: 'Code modules', asis: 4, target: 14, phase: 'V3' },
  { id: 'designDocs', label: 'Design docs', asis: 2, target: 6, phase: 'V2' },
  { id: 'auditDocs', label: 'Audit docs', asis: 1, target: 4, phase: 'V7' },
];
export const QUALITY_DEFAULT: QualityRow[] = [
  ['Bugs/1000 LOC', 2.0, 0.4, 'DORA'], ['Test coverage', 60, 90, 'Jest'], ['Review cycle (h)', 36, 3, 'GitHub'], ['Defect leakage %', 10, 3, 'Audits'],
  ['Doc sync %', 52, 96, 'Versioning'], ['Vuln/100 commits', 1.0, 0.2, 'Snyk'], ['eNPS', 27, 55, 'Surveys'],
];

const keyed = (s: CaseState) => s as unknown as Record<string, unknown>;
/** The case's anchor tables (state keys DORA_ANCHORS / THROUGHPUT_ANCHORS / QUALITY), code defaults when absent. */
export const doraAnchors = (s: CaseState): DoraAnchor[] => {
  const v = keyed(s).DORA_ANCHORS;
  return Array.isArray(v) && v.length ? (v as DoraAnchor[]) : DORA_DEFAULT;
};
export const throughputAnchors = (s: CaseState): ThroughputAnchor[] => {
  const v = keyed(s).THROUGHPUT_ANCHORS;
  return Array.isArray(v) && v.length ? (v as ThroughputAnchor[]) : THROUGHPUT_DEFAULT;
};
export const qualityRows = (s: CaseState): QualityRow[] => {
  const v = keyed(s).QUALITY;
  return Array.isArray(v) && v.length ? (v as QualityRow[]) : QUALITY_DEFAULT;
};

/** Legacy daGet: the case's anchor, else the default one. */
export const daGet = (s: CaseState, id: string): DoraAnchor => (doraAnchors(s).find((a) => a.id === id) ?? DORA_DEFAULT.find((a) => a.id === id)) as DoraAnchor;

/** Clamp to the declared [as-is, target] interval, whichever way the metric improves (legacy F9). */
export function anchorClamp(asis: number, target: number, r: number): number {
  const v = asis + (target - asis) * r;
  return target >= asis ? Math.min(v, target) : Math.max(v, target);
}
export const daVal = (s: CaseState, id: string, r: number): number => { const a = daGet(s, id); return anchorClamp(a.asis, a.target, r); };

/** Legacy daFmt: a DORA value in its own unit. */
export function daFmt(s: CaseState, id: string, v: number): string {
  const f = daGet(s, id).fmt;
  if (f === 'wk') return `${v < 2 ? v.toFixed(1) : Math.round(v)}/wk`;
  if (f === 'd') return `${v < 2 ? v.toFixed(1) : Math.round(v)}d`;
  if (f === 'h') return `${v < 1 ? v.toFixed(2) : v.toFixed(1)}h`;
  if (f === 'p') return `${Math.round(v)}%`;
  return String(Math.round(v));
}
