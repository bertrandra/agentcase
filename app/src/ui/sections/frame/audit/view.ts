import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { ActivityAudit, AuditBlock, AuditImport } from '@/domain/audit';

/**
 * View state of the 🔎 Audit section (never in the case, never undoable): the open view, the selected activity or role, the list filters, the
 * calibration proposals the user ticked, the last workbook import report, the auditor who works ("I am"), the interview, activity and block open in
 * the interview workspace, and the cells of the draft interview in the planner.
 */
export type AuditTab = 'cockpit' | 'plan' | 'interview' | 'elements' | 'insights' | 'catalogue';
/** A part of the interview sheet: a block of observed values (§ 15.3), the tools in use, or the pain points and evidence. */
export type SheetPart = AuditBlock | 'tools' | 'pain';
export interface AuditFilters { phase: string; capability: string; actor: string; audited: '' | 'yes' | 'no'; text: string }
export interface AuditView {
  tab: AuditTab; selected: string | null; filters: AuditFilters; accepted: string[]; report: AuditImport | null;
  auditor: string; interview: string | null; activity: string | null; block: SheetPart;
  /** planner draft: `role|activity` keys */
  draft: string[];
}
export const NO_FILTERS: AuditFilters = { phase: '', capability: '', actor: '', audited: '', text: '' };
const INITIAL: AuditView = { tab: 'cockpit', selected: null, filters: NO_FILTERS, accepted: [], report: null, auditor: '', interview: null, activity: null,
  block: 'readiness', draft: [] };
export const auditView = createStore<AuditView>(() => INITIAL);
export const useAuditView = <T,>(f: (s: AuditView) => T): T => useSyncExternalStore(auditView.subscribe, () => f(auditView.getState()));
/** Back to the initial view state (tests, a new case). */
export const resetAuditView = (): void => auditView.setState(INITIAL, true);

export const setAuditTab = (tab: AuditTab): void => auditView.setState({ tab });
export const selectElement = (id: string | null): void => auditView.setState({ selected: id });
/** Open an activity's or role's audit form in the Activities & roles view. */
export const openElement = (id: string): void => auditView.setState({ tab: 'elements', selected: id });
/** Open an interview in the interview workspace (its first activity unless one is named). */
export const openInterview = (code: string, activity: string | null = null): void =>
  auditView.setState({ tab: 'interview', interview: code, activity });
export const setInterviewFocus = (patch: Partial<Pick<AuditView, 'interview' | 'activity' | 'block' | 'auditor'>>): void => auditView.setState(patch);
export const setAuditFilter = <K extends keyof AuditFilters>(k: K, v: AuditFilters[K]): void =>
  auditView.setState((s) => ({ filters: { ...s.filters, [k]: v } }));
export const clearAuditFilters = (): void => auditView.setState({ filters: NO_FILTERS });
export const toggleAccepted = (key: string): void => auditView.setState((s) => ({
  accepted: s.accepted.includes(key) ? s.accepted.filter((k) => k !== key) : [...s.accepted, key] }));
export const setAccepted = (keys: string[]): void => auditView.setState({ accepted: keys });
export const setImportReport = (report: AuditImport | null): void => auditView.setState({ report });
export const toggleDraft = (key: string): void => auditView.setState((s) => ({
  draft: s.draft.includes(key) ? s.draft.filter((k) => k !== key) : [...s.draft, key] }));
export const clearDraft = (): void => auditView.setState({ draft: [] });

/** The rows the filters keep (phase, capability, actor id among the activity's roles / agent, audited or not, text on id and name). */
export function filtered(rows: readonly ActivityAudit[], f: AuditFilters, actorsOf: (id: string) => string[]): ActivityAudit[] {
  const q = f.text.trim().toLowerCase();
  return rows.filter((r) => r.inScope && (!f.phase || r.phase === f.phase) && (!f.capability || r.capability === f.capability)
    && (!f.audited || r.audited === (f.audited === 'yes')) && (!f.actor || actorsOf(r.id).includes(f.actor))
    && (!q || `${r.id} ${r.name}`.toLowerCase().includes(q)));
}
/** The key of a proposal in the accepted list. */
export const proposalKey = (p: { element: string; param: string }): string => `${p.element}:${p.param}`;
