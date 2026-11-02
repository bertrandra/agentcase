/** @calc-zone process-model */
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { readAudit } from './read';
import type { AuditStatus, ElementAudit, Interview } from './types';

/**
 * Audit activities (interviews) and their context (owner's request 2026-11-02): an audit activity targets one or more roles (the people interviewed)
 * and one or more process activities (what they do). An auditor picks one or more of them and sees the context of the interview: the roles, the
 * activities with what the audit already holds on each (status, observations, tools, pain points, evidence). Traceability: an activity is covered by
 * an audit activity when its own audit is closed or when evidence names the audit activity's code; the progression of an audit activity is the
 * share of its activities covered.
 */
export interface ContextActivity {
  id: string; name: string; phase: string; status?: AuditStatus; observations: number; tools: string[]; painPoints: string[]; evidence: number;
  /** covered by one of the selected audit activities (closed audit, or evidence naming one of them) */
  covered: boolean;
}
export interface InterviewContext {
  interviews: Interview[]; roles: { id: string; name: string }[]; activities: ContextActivity[];
  /** codes that are not audit activities of the case (ignored) */
  unknown: string[];
}
export interface InterviewProgress { code: string; activities: number; covered: number; share: number | null; status: AuditStatus }

const coveredBy = (a: ElementAudit | undefined, codes: ReadonlySet<string>): boolean =>
  !!a && (a.status === 'closed' || a.evidence.some((e) => e.interview !== undefined && codes.has(e.interview)));

/** The context of the selected audit activities: their roles and activities (each once, in the process's order), with the audit's facts. */
export function interviewContext(d: XDocument, codes: readonly string[]): InterviewContext {
  const audit = readAudit(d), all = audit.header?.interviews ?? [], picked = all.filter((i) => codes.includes(i.code)), v = readProcess(d);
  const set = new Set(picked.map((i) => i.code)), roleIds = new Set(picked.flatMap((i) => i.roles ?? []));
  const actIds = new Set(picked.flatMap((i) => i.activities ?? []));
  const roles = v.actors.filter((r) => roleIds.has(r.id)).map((r) => ({ id: r.id, name: r.name }));
  const activities = v.activities.filter((a) => actIds.has(a.id)).map((a): ContextActivity => {
    const e = audit.elements.get(a.id);
    return { id: a.id, name: a.name, phase: a.phase, ...(e?.status ? { status: e.status } : {}), observations: e?.observations.length ?? 0,
      tools: (e?.tools ?? []).map((t) => t.ref), painPoints: (e?.painPoints ?? []).map((p) => p.text), evidence: e?.evidence.length ?? 0,
      covered: coveredBy(e, set) };
  });
  return { interviews: picked, roles, activities, unknown: codes.filter((c) => !set.has(c)) };
}

/** The progression of every audit activity: its activities, those covered, the share (null without activity) and its status (stated, else derived). */
export function interviewProgress(d: XDocument): InterviewProgress[] {
  const audit = readAudit(d);
  return (audit.header?.interviews ?? []).map((i) => {
    const acts = i.activities ?? [], set = new Set([i.code]), covered = acts.filter((id) => coveredBy(audit.elements.get(id), set)).length;
    const share = acts.length ? covered / acts.length : null;
    const status: AuditStatus = i.status ?? (share === 1 ? 'closed' : covered > 0 ? 'inProgress' : 'planned');
    return { code: i.code, activities: acts.length, covered, share, status };
  });
}

/** The audit activities an auditor runs (by name; an audit activity with no auditor is listed for everyone). */
export const interviewsOf = (all: readonly Interview[], auditor: string): Interview[] =>
  all.filter((i) => !auditor || !i.auditor || i.auditor === auditor);
