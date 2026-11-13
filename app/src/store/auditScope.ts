/** @calc-zone process-model */
import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import { scopeExists } from '@/domain/portfolio';
import type { PortfolioDoc } from './types';

/**
 * The unit layer of the audit scope (owner's request 2026-11-13): the shared service or organisation unit whose audit the 🔎 Audit section shows
 * and edits, over the audit of the portfolio's common process or of the shown product. With two products or more it is the top bar's "Show"
 * (a unit shown is the unit audited, `scopeUnitId`); a single case has no Show, so the section keeps its own choice here. View state — never in
 * the case, never undoable; the audit commands read it to route an edit to the unit's own audit.
 */
interface AuditScopeState { unit: string | null }
export const auditScopeStore = createStore<AuditScopeState>(() => ({ unit: null }));
export const auditUnit = (): string | null => auditScopeStore.getState().unit;
export const setAuditUnit = (unit: string | null): void => { if (auditScopeStore.getState().unit !== unit) auditScopeStore.setState({ unit }); };
export const useAuditUnit = (): string | null => useSyncExternalStore(auditScopeStore.subscribe, auditUnit);
/** The unit of the audit scope: the unit "Show" names (2+ products; not the Unassigned node), else the section's own choice (one case). */
export function scopeUnitId(pf: PortfolioDoc, local: string | null): string | null {
  if (pf.products.length < 2) return local;
  const d = pf.displayScope;
  return d?.kind === 'unit' && d.id && scopeExists(pf, d) ? d.id : null;
}
