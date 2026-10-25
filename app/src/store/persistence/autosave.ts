import type { AppStore } from '../core';
import { sanitize } from './snapshot';
import { toPortfolioSnapshot } from './portfolioSnapshot';
import { openChecked } from './schema';
import { fileVersion, SNAPSHOT_SCHEMA_VERSION } from './schema/version';
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

/** At most this many records are kept (the legacy autosave keeps the 20 most recent): every tab load is a new record, the oldest go first. */
export const AUTOSAVE_CAP = 20;

export function memoryStorage(): AutosaveStorage {
  const m = new Map<string, AutosaveRecord>();
  return { put: async (r) => { m.set(r.tabId, structuredClone(r)); }, list: async () => [...m.values()].map((r) => structuredClone(r)), remove: async (id) => {
    m.delete(id);
  } };
}

/** Remove the records beyond the `cap` most recent (never `keep`, this tab's own record). Returns how many were removed. */
export async function pruneRecords(storage: AutosaveStorage, cap = AUTOSAVE_CAP, keep?: string): Promise<number> {
  const all = await storage.list(), mine = all.some((r) => r.tabId === keep);
  const others = all.filter((r) => r.tabId !== keep).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const old = others.slice(Math.max(0, mine ? cap - 1 : cap));
  for (const r of old) await storage.remove(r.tabId);
  return old.length;
}

export interface AutosaveOptions {
  delayMs?: number; setTimer?: (fn: () => void, ms: number) => unknown; clearTimer?: (h: unknown) => void; now?: () => Date;
  /** how many records the storage keeps (`AUTOSAVE_CAP`) */
  cap?: number;
  /** told once when a save fails (quota, blocked storage), and again only after a save succeeded in between */
  onError?: (e: unknown) => void;
}

/**
 * Debounced autosave of the document + its undo history (so Ctrl+Z survives a reload), then the oldest records beyond the cap are pruned. A failed
 * save never throws: it is reported through `onError` (once per failure streak) and `flush` resolves false.
 */
export function startAutosave(store: AppStore, storage: AutosaveStorage, tabId: string, o: AutosaveOptions = {}) {
  const setT = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms)), clearT = o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let handle: unknown = null, failing = false;
  const save = async (): Promise<boolean> => {
    handle = null;
    try {
      const s = store.getState(), name = (s.doc as { customerName?: string }).customerName;
      await storage.put({ tabId, savedAt: (o.now ?? (() => new Date()))().toISOString(), label: name || 'Untitled case',
        snapshot: toPortfolioSnapshot(s.portfolio, o.now, true), history: s.history, format: 'portfolio' });
      await pruneRecords(storage, o.cap, tabId);
      failing = false;
      return true;
    } catch (e) {
      console.error('AgentCase: the autosave could not be written:', e);
      if (!failing) o.onError?.(e);
      failing = true;
      return false;
    }
  };
  const off = store.onChange(() => { if (handle !== null) clearT(handle); handle = setT(() => { void save(); }, o.delayMs ?? 1500); });
  return { flush: save, stop: () => { off(); if (handle !== null) clearT(handle); } };
}

/**
 * Restore a record: the portfolio replaces the current one and the undo history comes back with it. Returns the corrections made to damaged values.
 * The history comes back only when its patches address exactly the restored document: a record of the current file schema (a migrated one may
 * have changed shape), of the portfolio format, opened without corrections.
 */
export function restoreRecord(store: AppStore, r: AutosaveRecord): string[] {
  const { portfolio, notes } = openChecked(r.snapshot), h = sanitize(r.history);
  store.load(portfolio);
  const current = fileVersion(r.snapshot) === SNAPSHOT_SCHEMA_VERSION;
  if (current && !notes.length && r.format === 'portfolio' && h && Array.isArray(h.undo) && Array.isArray(h.redo)) store.setHistory(h);
  return notes;
}
