import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { ProgrammeRow } from '@/domain/programme';

/**
 * View state of the 📋 Programme section (never in the case, never undoable): the filters, the sort, the row whose editor is open and the row a
 * link of the 🧩 Process section asked to show (highlighted, scrolled to, keyboard focus). The filtering and sorting are presentation only (no figure).
 */
export type SortKey = 'name' | 'phase' | 'type' | 'cost' | 'enabled';
export interface Filters { phase: string; level: '' | 'case' | 'product'; type: string; enabled: '' | 'on' | 'off' }
export interface ProgrammeScreenView { filters: Filters; sort: { key: SortKey | null; dir: 1 | -1 }; open: string | null; focus: string | null }
export const NO_FILTERS: Filters = { phase: '', level: '', type: '', enabled: '' };
const INITIAL: ProgrammeScreenView = { filters: NO_FILTERS, sort: { key: null, dir: 1 }, open: null, focus: null };

export const programmeScreen = createStore<ProgrammeScreenView>(() => INITIAL);
export const useProgrammeScreen = <T,>(f: (s: ProgrammeScreenView) => T): T =>
  useSyncExternalStore(programmeScreen.subscribe, () => f(programmeScreen.getState()));
export const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]): void =>
  programmeScreen.setState((s) => ({ filters: { ...s.filters, [k]: v } }));
export const clearFilters = (): void => programmeScreen.setState({ filters: NO_FILTERS });
export const sortBy = (key: SortKey): void =>
  programmeScreen.setState((s) => ({ sort: { key, dir: s.sort.key === key ? (-s.sort.dir as 1 | -1) : 1 } }));
export const toggleRow = (id: string): void => programmeScreen.setState((s) => ({ open: s.open === id ? null : id }));
/** Show row `id` (from the Process section): its editor open, highlighted, the filters cleared so that it is in the table. */
export const focusRow = (id: string): void => programmeScreen.setState({ open: id, focus: id, filters: NO_FILTERS });

const PHASE_ORDER = ['engagement', 'setup', 'run', 'assurance'];
const value = (r: ProgrammeRow, k: SortKey): string | number => {
  switch (k) {
    case 'name': return r.name.toLowerCase();
    case 'phase': return PHASE_ORDER.indexOf(r.phase);
    case 'type': return r.type.profile;
    case 'cost': return r.amount ?? -1;
    case 'enabled': return r.enabled.on ? 0 : 1;
  }
};
/** The rows the filters keep, in the chosen order (the document order when no sort is chosen; ties keep it). */
export function visibleRows(rows: ProgrammeRow[], f: Filters, sort: ProgrammeScreenView['sort']): ProgrammeRow[] {
  const kept = rows.filter((r) => (!f.phase || r.phase === f.phase) && (!f.level || r.level === f.level) && (!f.type || r.type.profile === f.type)
    && (!f.enabled || r.enabled.on === (f.enabled === 'on')));
  const k = sort.key;
  if (!k) return kept;
  return kept.map((r, i) => ({ r, i })).sort((a, b) => {
    const x = value(a.r, k), y = value(b.r, k);
    return x === y ? a.i - b.i : (x < y ? -1 : 1) * sort.dir;
  }).map((x) => x.r);
}
