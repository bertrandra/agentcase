import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { ImportReport, ReadOutcome } from '@/controllers/processImport';
import { DEFAULT_CHOICES, type ImportChoices } from '@/domain/process';

/**
 * View state of the 🧩 Process section (never in the case, never undoable): the selected activity, the table's filters and sort, and the import
 * in progress (the file read, the user's choices, the last report). The mappings the user chose (unit → phase, role → team skill) are remembered
 * for the session (F-B8 "remembered mapping"), so a second import of a similar file starts from them.
 */
export type SortKey = 'id' | 'name' | 'phase' | 'type' | 'role' | 'effort' | 'scope';
export interface Filters { phase: string; actor: string; type: string; scope: '' | 'in' | 'out'; regulatory: '' | 'yes' | 'no'; text: string }
export interface ProcessView {
  selected: string | null; filters: Filters; sort: { key: SortKey; dir: 1 | -1 };
  read: Extract<ReadOutcome, { ok: true }> | null; errors: string[]; choices: ImportChoices; report: ImportReport | null;
}
export const NO_FILTERS: Filters = { phase: '', actor: '', type: '', scope: '', regulatory: '', text: '' };
const INITIAL: ProcessView = {
  selected: null, filters: NO_FILTERS, sort: { key: 'id', dir: 1 }, read: null, errors: [], choices: DEFAULT_CHOICES, report: null,
};

export const processView = createStore<ProcessView>(() => INITIAL);
export const useProcessView = <T,>(f: (s: ProcessView) => T): T => useSyncExternalStore(processView.subscribe, () => f(processView.getState()));

const remembered: { phaseOf: Record<string, string>; teamSkillOf: Record<string, string> } = { phaseOf: {}, teamSkillOf: {} };

/** Back to the initial view state (a new case, a test). */
export const resetProcessView = (): void => processView.setState(INITIAL, true);
export const selectActivity = (id: string | null): void => processView.setState({ selected: id });
export const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]): void => processView.setState((s) => ({ filters: { ...s.filters, [k]: v } }));
export const clearFilters = (): void => processView.setState({ filters: NO_FILTERS });
export const sortBy = (key: SortKey): void => processView.setState((s) => ({ sort: { key, dir: s.sort.key === key ? (-s.sort.dir as 1 | -1) : 1 } }));

/** A file was read: refused (its errors) or ready for the preview, with the remembered mappings applied. */
export function fileRead(r: ReadOutcome): void {
  if (!r.ok) { processView.setState({ read: null, errors: r.errors, report: null }); return; }
  const choices: ImportChoices = { ...DEFAULT_CHOICES, phaseOf: { ...remembered.phaseOf }, teamSkillOf: { ...remembered.teamSkillOf } };
  processView.setState({ read: r, errors: [], choices, report: null });
}
export function choose(patch: Partial<ImportChoices>): void {
  processView.setState((s) => ({ choices: { ...s.choices, ...patch } }));
  if (patch.phaseOf) Object.assign(remembered.phaseOf, patch.phaseOf);
  if (patch.teamSkillOf) Object.assign(remembered.teamSkillOf, patch.teamSkillOf);
}
export const cancelImport = (): void => processView.setState({ read: null, errors: [], choices: DEFAULT_CHOICES });
export const importDone = (report: ImportReport): void => processView.setState({ read: null, errors: [], report });
export const closeReport = (): void => processView.setState({ report: null });
