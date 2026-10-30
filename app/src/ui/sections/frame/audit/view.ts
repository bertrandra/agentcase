import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { ActivityAudit, AuditImport } from '@/domain/audit';

/**
 * View state of the 🔎 Audit section (never in the case, never undoable): the selected activity or role, the list filters, the calibration
 * proposals the user ticked and the last workbook import report.
 */
export interface AuditFilters { phase: string; capability: string; actor: string; audited: '' | 'yes' | 'no'; text: string }
export interface AuditView { selected: string | null; filters: AuditFilters; accepted: string[]; report: AuditImport | null }
export const NO_FILTERS: AuditFilters = { phase: '', capability: '', actor: '', audited: '', text: '' };
export const auditView = createStore<AuditView>(() => ({ selected: null, filters: NO_FILTERS, accepted: [], report: null }));
export const useAuditView = <T,>(f: (s: AuditView) => T): T => useSyncExternalStore(auditView.subscribe, () => f(auditView.getState()));

export const selectElement = (id: string | null): void => auditView.setState({ selected: id });
export const setAuditFilter = <K extends keyof AuditFilters>(k: K, v: AuditFilters[K]): void =>
  auditView.setState((s) => ({ filters: { ...s.filters, [k]: v } }));
export const clearAuditFilters = (): void => auditView.setState({ filters: NO_FILTERS });
export const toggleAccepted = (key: string): void => auditView.setState((s) => ({
  accepted: s.accepted.includes(key) ? s.accepted.filter((k) => k !== key) : [...s.accepted, key] }));
export const setAccepted = (keys: string[]): void => auditView.setState({ accepted: keys });
export const setImportReport = (report: AuditImport | null): void => auditView.setState({ report });

/** The rows the filters keep (phase, capability, actor id among the activity's roles / agent, audited or not, text on id and name). */
export function filtered(rows: readonly ActivityAudit[], f: AuditFilters, actorsOf: (id: string) => string[]): ActivityAudit[] {
  const q = f.text.trim().toLowerCase();
  return rows.filter((r) => r.inScope && (!f.phase || r.phase === f.phase) && (!f.capability || r.capability === f.capability)
    && (!f.audited || r.audited === (f.audited === 'yes')) && (!f.actor || actorsOf(r.id).includes(f.actor))
    && (!q || `${r.id} ${r.name}`.toLowerCase().includes(q)));
}
/** The key of a proposal in the accepted list. */
export const proposalKey = (p: { element: string; param: string }): string => `${p.element}:${p.param}`;
