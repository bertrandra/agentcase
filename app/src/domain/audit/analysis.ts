/** @calc-zone process-model */
import { readRaci } from '../org/readRaci';
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { capabilityKey, effectiveCatalog } from './catalog';
import { readAudit } from './read';
import type { ElementAudit, Observation } from './types';

/**
 * Observed versus modelled (F-B28), per activity of the case's process: the audit's values next to the model parameters they speak about.
 * A view only: nothing here is a figure of the business case (D-B11); calibration (calibrate.ts) is the one path from the audit to the model.
 */
export const AUTOMATION_AUTHORITY: Record<string, string> = {
  none: 'Assistance', scripted: 'Copilot', pipeline: 'Supervised autonomous', agentic: 'Autonomous',
};
/** Periods per month, to put volumes of different periods on one scale (2-week sprints, 21 working days); release / project: not comparable. */
export const PER_MONTH: Record<string, number> = { day: 21, week: 52 / 12, sprint: 26 / 12, month: 1, quarter: 1 / 3, year: 1 / 12 };

export interface RoleShare { role: string; observed: number; modelled: number | null }
export interface ActivityAudit {
  id: string; name: string; phase: string; capability: string; inScope: boolean; regulatory: boolean; effort: number; aiAuthority: string;
  audited: boolean; status?: string; tools: string[];
  /** observed person-hours per month: effort per item (or the sum of its per-role values) × items per period × periods per month */
  hoursPerMonth: number | null; hoursFormula?: string;
  reworkRate: number | null; reworkFlows: { id: string; probability: number }[];
  automation?: string; impliedAuthority?: string;
  fte: RoleShare[];
  painPoints: number;
}

const num = (o: Observation | undefined): number | null => (o && Number.isFinite(Number(o.value)) ? Number(o.value) : null);
const obs = (a: ElementAudit | undefined, name: string, role?: string): Observation | undefined =>
  a?.observations.find((o) => o.name === name && o.role === role);
const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;

function hours(a: ElementAudit | undefined): Pick<ActivityAudit, 'hoursPerMonth' | 'hoursFormula'> {
  const own = num(obs(a, 'effortPerItem')), split = (a?.observations ?? []).filter((o) => o.name === 'effortPerItem' && o.role !== undefined);
  const perItem = own ?? (split.length ? split.reduce((t, o) => t + (num(o) ?? 0), 0) : null);
  const items = obs(a, 'itemsPerPeriod'), n = num(items), k = items?.per ? PER_MONTH[items.per] : undefined;
  if (perItem === null || n === null || k === undefined) return { hoursPerMonth: null };
  return { hoursPerMonth: r4(perItem * n * k), hoursFormula: `${perItem} h/item × ${n} items/${items!.per} × ${r4(k)} ${items!.per}/month` };
}

/** Modelled share of each role's load on an activity: its effort over the effort of every in-scope activity the role is Responsible for. */
function modelledShares(d: XDocument): Map<string, Map<string, number>> {
  const load = new Map<string, number>(), raci = readRaci(d).filter((a) => a.inScope);
  for (const a of raci) for (const r of a.raci.R) load.set(r, (load.get(r) ?? 0) + a.effort);
  const out = new Map<string, Map<string, number>>();
  for (const a of raci) out.set(a.id, new Map(a.raci.R.map((r) => [r, load.get(r) ? r4((a.effort / load.get(r)!) * 100) : 0])));
  return out;
}

const memo = new WeakMap<XDocument, ActivityAudit[]>();
/** Every activity of the document with its observed-versus-modelled values (memoised on the document). */
export function activityAudits(d: XDocument): ActivityAudit[] {
  const hit = memo.get(d);
  if (hit) return hit;
  const v = readProcess(d), audit = readAudit(d), shares = modelledShares(d), offPhases = new Set(v.phases.filter((p) => p.inScope === false).map((p) => p.id));
  const out = v.activities.map((x): ActivityAudit => {
    const a = audit.elements.get(x.id), auto = obs(a, 'automationLevel')?.value, rr = num(obs(a, 'reworkRate'));
    const row: ActivityAudit = {
      id: x.id, name: x.name, phase: x.phase, capability: x.capability ?? '', inScope: x.inScope !== false && !offPhases.has(x.phase), regulatory: x.regulatory,
      effort: x.effort, aiAuthority: x.aiAuthority, audited: !!a && (a.tools.length + a.observations.length + a.painPoints.length + a.evidence.length > 0),
      tools: (a?.tools ?? []).map((t) => t.ref), ...hours(a), reworkRate: rr === null ? null : rr / 100,
      reworkFlows: v.flows.filter((f) => f.rework?.activityA === x.id).map((f) => ({ id: f.id, probability: f.rework!.probability })),
      fte: (a?.observations ?? []).filter((o) => o.name === 'fteShare' && o.role).map((o) => ({ role: o.role!, observed: num(o) ?? 0,
        modelled: shares.get(x.id)?.get(o.role!) ?? null })),
      painPoints: a?.painPoints.length ?? 0,
    };
    if (a?.status) row.status = a.status;
    if (auto) { row.automation = auto; const imp = AUTOMATION_AUTHORITY[auto]; if (imp) row.impliedAuthority = imp; }
    return row;
  });
  memo.set(d, out);
  return out;
}

/** The audit progress of an activity, as the 🧩 Process diagram colours it (FX-15): its status when it has one, "Audited" when it holds audit data
 *  without a status, else "Not audited" (left uncoloured). The coloured categories, in colour order: */
export const AUDIT_PROGRESS = ['Planned', 'In progress', 'Audited', 'Closed'] as const;
export const NOT_AUDITED = 'Not audited';
export function auditProgressOf(r: Pick<ActivityAudit, 'audited' | 'status'>): string {
  if (r.status === 'closed') return 'Closed';
  if (r.status === 'inProgress') return 'In progress';
  return r.audited ? 'Audited' : r.status === 'planned' ? 'Planned' : NOT_AUDITED;
}

export interface Coverage { inScope: number; audited: number; effort: number; auditedEffort: number; share: number; byEffort: number }
/** Coverage (F-B28): share of the in-scope activities audited, by count and weighted by effort. */
export function coverage(rows: readonly ActivityAudit[]): Coverage {
  const on = rows.filter((r) => r.inScope), done = on.filter((r) => r.audited);
  const effort = on.reduce((t, r) => t + r.effort, 0), auditedEffort = done.reduce((t, r) => t + r.effort, 0);
  return { inScope: on.length, audited: done.length, effort, auditedEffort, share: on.length ? done.length / on.length : 0,
    byEffort: effort ? auditedEffort / effort : 0 };
}

export interface CapabilityRow { capability: string; activities: number; audited: number; tools: string[]; gap: boolean; overlap: boolean }
/**
 * The tooling map (F-B28): per capability of the in-scope activities, the tools in use that serve it (by the effective catalogue). A gap: no tool
 * in use serves the capability; an overlap: several tools do.
 */
export function toolingMap(d: XDocument, rows: readonly ActivityAudit[] = activityAudits(d)): CapabilityRow[] {
  const cat = new Map(effectiveCatalog(readAudit(d)).map((t) => [t.code, t])), by = new Map<string, CapabilityRow>();
  for (const r of rows.filter((x) => x.inScope && x.capability)) {
    const key = capabilityKey(r.capability), row = by.get(key) ?? { capability: r.capability, activities: 0, audited: 0, tools: [], gap: true, overlap: false };
    row.activities++;
    if (r.audited) row.audited++;
    for (const t of r.tools) if (cat.get(t)?.capabilities.some((c) => capabilityKey(c) === key) && !row.tools.includes(t)) row.tools.push(t);
    by.set(key, row);
  }
  return [...by.values()].map((r) => ({ ...r, gap: r.tools.length === 0, overlap: r.tools.length > 1 }))
    .sort((a, b) => a.capability.localeCompare(b.capability));
}

export interface PhaseProgress { phase: string; name: string; inScope: number; audited: number }
/** Audit progress per phase (F-B31): in-scope activities and how many are audited. */
export function phaseProgress(d: XDocument, rows: readonly ActivityAudit[] = activityAudits(d)): PhaseProgress[] {
  return readProcess(d).phases.map((p) => {
    const on = rows.filter((r) => r.phase === p.id && r.inScope);
    return { phase: p.id, name: p.name, inScope: on.length, audited: on.filter((r) => r.audited).length };
  }).filter((p) => p.inScope > 0);
}
