/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import { engagementCoef } from '../engagement';
import { khMult } from '../knowledge';
import { lifecycleAutoPosture } from '../lifecycle';
import { computeGlassCeiling } from '../model/ceiling';
import { sddMaturity } from '../model/vtax';
import { ASSUMPTION_DEFS, benchmarkBase, type AssumptionBase, type Validated } from './assumptions';
import coefficients from './ddCoefficients.json';
import { ceilingRows, DD_CEIL_TARGET } from './ddCeiling';

/** A DORA / throughput anchor as the due-diligence register edits it (labels and formats are optional there). */
interface Anchor { id: string; label?: string; asis: number; target: number; fmt?: string; dir?: string }

export type DdEdit = 'here' | 'derived' | 'NONE' | { sec: string; also?: string; note?: string };
export type DdField = { kind: 'coef'; key: string } | { kind: 'dora' | 'thr'; id: string } | { kind: 'qual'; i: number } | { kind: 'fg'; key: string };
export type DdClass = 'PC1' | 'PC2' | 'PC3' | 'PC4' | 'PC5';
export interface DdRow {
  id: string; g: string; l: string; v: number | string | null; where: string; eff: string; edit: DdEdit; cls: DdClass; ok?: boolean;
  ceilShare?: number; ceilRole?: string; ask?: string;
  /** editable value(s): as-is / value, target, their shipped defaults, and which document field they write */
  ed?: { a: number; t: number | null; da?: number; dt?: number; field: DdField };
}
export type DdStatus = 'open' | 'requested' | 'confirmed' | 'disputed' | 'waived';
export const DD_STATUSES: DdStatus[] = ['open', 'requested', 'confirmed', 'disputed', 'waived'];
export interface DdState { [id: string]: { st?: DdStatus; owner?: string; dueDate?: string; note?: string } }

type Qual = [string, number, number, string];
export interface DdDoc { COEF: Record<string, number>; DORA_ANCHORS?: Anchor[]; THROUGHPUT_ANCHORS?: Anchor[]; QUALITY?: Qual[]; FG_PARAMS?: Record<string, number | null>; DD_STATE?: DdState }
const doc = (c: Ctx) => c.s as unknown as DdDoc;

const FG_LABEL: Record<string, string> = {
  sprintWeeks: 'Sprint length (weeks)', piWeeks: 'Program increment (weeks)', releaseEveryWeeks: 'Weeks between releases', rcLeadDays: 'RC cut before release (days)',
  approvalRejectRate: 'Release candidates rejected', approvalLeadDays: 'Approval decision (days)', envPromotionDays: 'Days between environment promotions', deployFailRate: 'Failed deployments',
  rollbackRate: 'Production rollbacks', retryDelayDays: 'Retry delay after failure (days)', commitsPerAgentRun: 'Commits per agent run', humanCommitsPerDevWeek: 'Human commits per dev-week',
  buildsPerWeek: 'Builds per week', buildFailRate: 'Failed builds', artefactsPerBuild: 'Artefacts per successful build', gateFailRate: 'Quality-gate failure rate',
  incidentsPerProdDeploy: 'Monitoring events per production deployment', sevCritical: 'Share of events Critical', sevWarning: 'Share of events Warning',
  feedbackPerRelease: 'Feedback items per release', rollWeeks: 'Rolling window for rates (weeks)', minSample: 'Minimum events before a rate is reported', density: 'Volume density',
  maxRecords: 'Record cap', seed: 'PRNG seed',
};

/** Live value of the coefficients that are not a plain COEF entry (null when the engine cannot give one). */
function coefValue(c: Ctx, id: string): number | null {
  const safe = (v: number): number | null => (typeof v === 'number' && !isNaN(v) ? v : null);
  switch (id) {
    case 'cf-vtax-base': { let b = c.inp.p('vtaxBase'); if (isNaN(b)) b = 0.3; return safe(b * (1 - 0.5 * (sddMaturity(c) / 100))); }
    case 'cf-glassfactor': return safe(engagementCoef(c).glassFactor);
    case 'cf-rampcap': return safe(engagementCoef(c).rampCapPct);
    case 'cf-rampspeed': return safe(engagementCoef(c).rampSpeed);
    case 'cf-khmult': return safe(khMult(c)) ?? 1;
    case 'cf-autoposture': return safe(lifecycleAutoPosture(c.s)) ?? 1;
    case 'cf-ceiling': return safe(computeGlassCeiling(c));
    default: return null;
  }
}

/** Every item a client must confirm, in the legacy order: coefficients, supervision floor, metric anchors, model inputs, factory parameters. */
export function ddRows(c: Ctx, base: DdDoc & AssumptionBase, ok: Validated = {}): DdRow[] {
  const d = doc(c), coef: DdRow[] = coefficients.map((x) => {
    const k = (x as { k?: string }).k, row: DdRow = { id: x.id, g: x.g, l: x.l, v: k ? d.COEF[k] ?? null : coefValue(c, x.id), where: x.where, eff: x.eff, edit: x.edit as DdEdit, cls: 'PC5' };
    if (k) { row.ed = { a: d.COEF[k] as number, t: null, da: base.COEF[k], field: { kind: 'coef', key: k } }; row.edit = 'here'; }
    return row;
  });
  const anchor = (id: string, g: string, l: string, a: Anchor, def: Anchor | undefined, where: string, eff: string, field: DdField): DdRow =>
    ({ id, g, l, v: `${a.asis} → ${a.target}`, where, eff, edit: 'here', cls: 'PC4', ed: { a: a.asis, t: a.target, da: def?.asis, dt: def?.target, field } });
  const dora = (d.DORA_ANCHORS ?? []).map((a, i) => anchor(`an-${a.id}`, 'Metric anchors (DORA / velocity)', a.label ?? a.id, a, base.DORA_ANCHORS?.[i], 'DORA_ANCHORS', 'Seeds the velocity tab and the KPI scorecard.', { kind: 'dora', id: a.id }));
  const thr = (d.THROUGHPUT_ANCHORS ?? []).map((a, i) => anchor(`an-${a.id}`, 'Metric anchors (throughput)', a.label ?? a.id, a, base.THROUGHPUT_ANCHORS?.[i], 'THROUGHPUT_ANCHORS', 'Drives the productivity categories and the consolidated throughput row.', { kind: 'thr', id: a.id }));
  const qual = (d.QUALITY ?? []).map((q, i): DdRow => ({ id: `an-q${i}`, g: 'Metric anchors (quality)', l: q[0], v: `${q[1]} → ${q[2]}`, where: 'QUALITY', eff: 'Drives the quality table and the KPI scorecard.',
    edit: { sec: 'quality', note: 'as-is also editable in Quality — target only here' }, cls: 'PC4', ed: { a: q[1], t: q[2], da: base.QUALITY?.[i]?.[1], dt: base.QUALITY?.[i]?.[2], field: { kind: 'qual', i } } }));
  const inputs = ASSUMPTION_DEFS.map((a): DdRow => {
    const cur = a.id === 'horizon' ? c.inp.v(a.id) : c.s.dom.values[a.id], def = base.dom.values[a.id];
    return { id: `in-${a.id}`, g: `Inputs — ${a.g}`, l: a.l, v: cur === undefined ? '—' : cur, where: 'assumptions register', eff: String(cur) !== String(def) ? `Adjusted from default ${def}` : 'At default',
      edit: { sec: 'assumptions', also: 'params', note: 'set in Parameters / Levers, tracked in the register' }, cls: 'PC1', ok: !!ok[a.id] };
  });
  const fg = Object.keys(base.FG_PARAMS ?? {}).map((k): DdRow => {
    const raw = d.FG_PARAMS?.[k], v = raw == null || isNaN(raw) ? (base.FG_PARAMS?.[k] as number) : raw;
    return { id: `fg-${k}`, g: 'Factory generation parameters', l: FG_LABEL[k] ?? k, v, where: 'FG_PARAMS', cls: 'PC4', eff: 'Shapes the generated factory data. No euro path — illustration only.',
      edit: 'here', ed: { a: v, t: null, da: base.FG_PARAMS?.[k] as number, field: { kind: 'fg', key: k } },
      ask: 'Confirm this reflects how delivery actually runs in your organisation — or provide the measured value from your tooling so it can replace the estimate.' };
  });
  return [...coef, ...ceilingRows(c, ceilTarget(c)), ...dora, ...thr, ...qual, ...inputs, ...fg];
}

/** Share of the artefacts' supervision weight named individually (default 0.85). */
export const ceilTarget = (c: Ctx): number => { const v = (c.s as unknown as { ddCeilingCoverTarget?: number }).ddCeilingCoverTarget; return typeof v === 'number' ? v : DD_CEIL_TARGET; };

export const ddStatus = (c: Ctx, id: string): DdStatus => doc(c).DD_STATE?.[id]?.st ?? 'open';
export const isDone = (c: Ctx, r: DdRow): boolean => ddStatus(c, r.id) === 'confirmed' || ddStatus(c, r.id) === 'waived' || !!r.ok;

/** Share of the glass-ceiling weight sitting on rows confirmed or waived; null when no row carries a share. */
export function ceilingCoverage(c: Ctx, rows: DdRow[]): number | null {
  let tot = 0, done = 0;
  for (const r of rows) {
    if (r.ceilShare == null) continue;
    tot += r.ceilShare;
    const st = ddStatus(c, r.id);
    if (st === 'confirmed' || st === 'waived') done += r.ceilShare;
  }
  return tot > 0 ? done / tot : null;
}

/** Where a row is used: reaches model() (calc) and/or feeds the Factory group. */
const USE_COEF: Record<string, { calc: boolean; factory: boolean }> = {
  'cf-vtax-cap': { calc: true, factory: false }, 'cf-vtax-base': { calc: true, factory: false }, 'cf-qual-cap': { calc: true, factory: true }, 'cf-hri-floor': { calc: true, factory: false },
  'cf-hri-slope': { calc: true, factory: false }, 'cf-glassfactor': { calc: true, factory: false }, 'cf-rampcap': { calc: true, factory: false }, 'cf-rampspeed': { calc: true, factory: false },
  'cf-khmult': { calc: true, factory: false }, 'cf-autoposture': { calc: true, factory: false }, 'cf-ceiling': { calc: true, factory: true },
};
export function ddUse(r: DdRow): { calc: boolean; factory: boolean } {
  if (USE_COEF[r.id]) return USE_COEF[r.id]!;
  if (r.id.startsWith('ce-') || r.id.startsWith('ceg-')) return { calc: true, factory: true };
  if (r.id.startsWith('in-')) return { calc: true, factory: false };
  if (r.id.startsWith('fg-')) return { calc: false, factory: true };
  return { calc: false, factory: false };
}

/** The benchmark the register compares to: shipped input defaults + the default document's anchors, coefficients and factory parameters. */
export const ddBase = (defaultDoc: object): DdDoc & AssumptionBase => benchmarkBase(defaultDoc) as DdDoc & AssumptionBase;
