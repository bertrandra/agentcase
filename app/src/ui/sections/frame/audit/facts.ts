import { interviewProgress, proposals, type Proposal, type AuditStatus, type ElementAudit, type Interview, type InterviewProgress } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';

/**
 * What the cockpit, the planner and the interview workspace read from the audit of the scope (pure, from `AuditViewData`): the interviews of the
 * scope with their progression, the interview(s) planning each activity, the state of each activity tile and the quality of the observations.
 */
export type TileState = 'closed' | 'inProgress' | 'audited' | 'planned' | 'none';
export const TILE_LABEL: Record<TileState, string> = {
  closed: 'Closed', inProgress: 'In progress', audited: 'Audited', planned: 'Planned in an interview', none: 'Not audited',
};

/** An interview is in the scope when it names an activity of the scope, or names none (it is then listed everywhere). */
export function scopeInterviews(data: AuditViewData): Interview[] {
  const all = data.audit.header?.interviews ?? [], ids = new Set(data.rows.map((r) => r.id));
  return data.scope.activities ? all.filter((i) => !i.activities?.length || i.activities.some((a) => ids.has(a))) : all;
}
export interface InterviewCard { interview: Interview; progress: InterviewProgress }
export function interviewCards(data: AuditViewData): InterviewCard[] {
  const p = new Map(interviewProgress(data.doc).map((x) => [x.code, x]));
  return scopeInterviews(data).map((interview) => ({ interview, progress: p.get(interview.code)
    ?? { code: interview.code, activities: 0, covered: 0, share: null, status: interview.status ?? 'planned' } }));
}
export const byStatus = (cards: readonly InterviewCard[], s: AuditStatus): InterviewCard[] => cards.filter((c) => c.progress.status === s);

/** The codes of the interviews that name each activity. */
export function plannedBy(interviews: readonly Interview[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const i of interviews) for (const a of i.activities ?? []) out.set(a, [...(out.get(a) ?? []), i.code]);
  return out;
}
/** The state of an activity: its audit status, else audited / planned in an interview / not audited. */
export function tileState(a: ElementAudit | undefined, audited: boolean, planned: boolean): TileState {
  if (a?.status === 'closed') return 'closed';
  if (a?.status === 'inProgress') return 'inProgress';
  if (audited) return 'audited';
  return planned ? 'planned' : 'none';
}

export interface ObservationStats { count: number; sourced: number; low: number; painPoints: number; topPain: { id: string; name: string; n: number } | null }
/** The observations of the scope's activities: how many, how many carry a source, how many have low confidence; the pain points. */
export function observationStats(data: AuditViewData): ObservationStats {
  let count = 0, sourced = 0, low = 0, painPoints = 0, topPain: ObservationStats['topPain'] = null;
  for (const r of data.rows.filter((x) => x.inScope)) {
    const a = data.audit.elements.get(r.id);
    if (!a) continue;
    count += a.observations.length; sourced += a.observations.filter((o) => o.source).length;
    low += a.observations.filter((o) => o.confidence === 'low').length;
    painPoints += a.painPoints.length;
    if (a.painPoints.length && (!topPain || a.painPoints.length > topPain.n)) topPain = { id: r.id, name: r.name, n: a.painPoints.length };
  }
  return { count, sourced, low, painPoints, topPain };
}

/** The next code of an interview: INT-n after the highest number in use. */
export function nextCode(interviews: readonly Interview[]): string {
  const n = interviews.reduce((m, i) => Math.max(m, Number(/^INT-(\d+)$/.exec(i.code)?.[1] ?? 0)), 0);
  return `INT-${n + 1}`;
}
export const pct = (x: number | null): string => (x === null ? '—' : `${Math.round(x * 100)} %`);
/** The roles of an interview, by name. */
export const roleNames = (i: Interview, names: ReadonlyMap<string, string>): string =>
  (i.roles?.length ? i.roles.map((r) => names.get(r) ?? r).join(', ') : i.role);

/** The calibration proposals of the scope: those on its activities and on the rework flows of its activities (all of them without a unit). */
export function scopeProposals(data: AuditViewData): Proposal[] {
  const all = proposals(data.doc);
  if (!data.scope.activities) return all;
  const ids = new Set(data.rows.map((r) => r.id)), flows = new Set(data.rows.flatMap((r) => r.reworkFlows.map((f) => f.id)));
  return all.filter((p) => ids.has(p.element) || flows.has(p.element));
}
