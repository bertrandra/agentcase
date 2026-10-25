import type { AppStore } from '../core';
import { sanitize } from './snapshot';
import { toPortfolioSnapshot } from './portfolioSnapshot';
import { openChecked } from './schema';
import type { HistoryState } from '../types';

/**
 * `format: 'portfolio'` marks a record whose snapshot is the exact portfolio and whose history patches address it. Records written before the
 * portfolio store (no `format`) carry case-level patches: their document is restored, their history is not.
 */
export interface AutosaveRecord { tabId: string; savedAt: string; label: string; snapshot: Record<string, unknown>; history: HistoryState;
  format?: 'portfolio' }
/** Where records live: IndexedDB in the browser, a Map in tests. */
export interface AutosaveStorage {
  put(r: AutosaveRecord): Promise<void>;
  list(): Promise<AutosaveRecord[]>;
  remove(tabId: string): Promise<void>;
}

export function memoryStorage(): AutosaveStorage {
  const m = new Map<string, AutosaveRecord>();
  return { put: async (r) => { m.set(r.tabId, structuredClone(r)); }, list: async () => [...m.values()].map((r) => structuredClone(r)), remove: async (id) => {
    m.delete(id);
  } };
}

export interface AutosaveOptions { delayMs?: number; setTimer?: (fn: () => void, ms: number) => unknown; clearTimer?: (h: unknown) => void; now?: () => Date }

/** Debounced autosave of the document + its undo history (so Ctrl+Z survives a reload). */
export function startAutosave(store: AppStore, storage: AutosaveStorage, tabId: string, o: AutosaveOptions = {}) {
  const setT = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms)), clearT = o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let handle: unknown = null;
  const save = async () => {
    handle = null;
    const s = store.getState(), name = (s.doc as { customerName?: string }).customerName;
    await storage.put({ tabId, savedAt: (o.now ?? (() => new Date()))().toISOString(), label: name || 'Untitled case',
      snapshot: toPortfolioSnapshot(s.portfolio, o.now, true), history: s.history, format: 'portfolio' });
  };
  const off = store.onChange(() => { if (handle !== null) clearT(handle); handle = setT(() => { void save(); }, o.delayMs ?? 1500); });
  return { flush: save, stop: () => { off(); if (handle !== null) clearT(handle); } };
}

/**
 * Restore a record: the portfolio replaces the current one and the undo history comes back with it. Returns the corrections made to damaged values;
 * a corrected record does not get its history back (its patches address the uncorrected document).
 */
export function restoreRecord(store: AppStore, r: AutosaveRecord): string[] {
  const { portfolio, notes } = openChecked(r.snapshot), h = sanitize(r.history);
  store.load(portfolio);
  if (!notes.length && r.format === 'portfolio' && h && Array.isArray(h.undo) && Array.isArray(h.redo)) store.setHistory(h);
  return notes;
}
