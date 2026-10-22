import { applyPatches, enablePatches, type Patch } from 'immer';
import { createStore } from 'zustand/vanilla';
import { EMPTY_HISTORY, popRedo, popUndo, pushEntry } from './history';
import { asPortfolio, deriveDoc, normalizeActive, runCommands } from './portfolioState';
import type { AuditRecord, Command, Doc, HistoryEntry, HistoryState, PortfolioDoc } from './types';

enablePatches();

export interface StoreOptions { now?: () => number; coalesceMs?: number; cap?: number; auditCap?: number }
/**
 * `portfolio` is the source of truth (history, audit, autosave and broadcast patches are on it); `doc` is DERIVED from it: the effective
 * case of the active product, so every selector and controller written for a single case keeps working unchanged.
 */
export interface AppStoreState { portfolio: PortfolioDoc; doc: Doc; history: HistoryState; audit: AuditRecord[]; rev: number }
type Listener = (kind: AuditRecord['kind'], entry?: HistoryEntry) => void;

/** The single write path: dispatch(command) → Immer patches on the portfolio → history → subscribers. */
export function createAppStore(initial: Doc | PortfolioDoc, opts: StoreOptions = {}) {
  const now = opts.now ?? Date.now, auditCap = opts.auditCap ?? 500;
  const first = asPortfolio(initial);
  const store = createStore<AppStoreState>(() => ({ portfolio: first, doc: deriveDoc(first), history: EMPTY_HISTORY, audit: [], rev: 0 }));
  const listeners = new Set<Listener>();
  const get = () => store.getState();
  const log = (s: AppStoreState, kind: AuditRecord['kind'], type: string, label: string): AuditRecord[] =>
    [...s.audit, { ts: now(), type, label, kind }].slice(-auditCap);
  const emit = (kind: AuditRecord['kind'], e?: HistoryEntry) => listeners.forEach((l) => l(kind, e));
  /** Commit a new portfolio: the derived case follows. */
  const commit = (s: AppStoreState, portfolio: PortfolioDoc, rest: Partial<AppStoreState>) => {
    const pf = normalizeActive(portfolio);
    store.setState({ portfolio: pf, doc: deriveDoc(pf), rev: s.rev + 1, ...rest });
  };

  /** Apply several commands as ONE history step. */
  function batch(label: string, cmds: Command[], coalesceKey?: string): void {
    const s = get(), [pf, patches, inverse] = runCommands(s.portfolio, cmds);
    if (!patches.length) return;
    const undoable = cmds.some((c) => c.undoable);
    const entry: HistoryEntry = { label, type: cmds.length === 1 ? (cmds[0] as Command).type : 'batch', ts: now(), coalesceKey, patches, inverse };
    commit(s, pf, { history: undoable ? pushEntry(s.history, entry, opts.coalesceMs, opts.cap) : s.history, audit: log(s, 'do', entry.type, label) });
    emit('do', entry);
  }
  const dispatch = <P>(cmd: Command<P>): void => batch(cmd.label, [cmd as Command], cmd.coalesceKey);

  function step(dir: 'undo' | 'redo'): boolean {
    const s = get(), r = dir === 'undo' ? popUndo(s.history) : popRedo(s.history);
    if (!r) return false;
    commit(s, applyPatches(s.portfolio, dir === 'undo' ? r.entry.inverse : r.entry.patches) as PortfolioDoc, { history: r.next, audit: log(s, dir, r.entry.type, r.entry.label) });
    emit(dir, r.entry);
    return true;
  }
  /** Undo/redo until `index` steps remain on the undo stack (history-panel jump). */
  function jumpTo(index: number): void {
    while (get().history.undo.length > index && step('undo')) { /* undo */ }
    while (get().history.undo.length < index && step('redo')) { /* redo */ }
  }
  /** Replace the whole document (open a case or a portfolio). `keepHistory` makes it an undoable step instead of a fresh start. */
  function load(input: Doc | PortfolioDoc, keepHistory = false): void {
    const s = get(), next = asPortfolio(input);
    if (!keepHistory) { commit(s, next, { history: EMPTY_HISTORY, audit: log(s, 'load', 'doc.load', 'Open case') }); emit('load'); return; }
    const replace = (d: PortfolioDoc) => { Object.keys(d).forEach((k) => delete (d as unknown as Record<string, unknown>)[k]); Object.assign(d, next); };
    batch('Open case', [{ type: 'doc.load', payload: next, label: 'Open case', undoable: true, run: () => undefined, runPortfolio: replace }]);
  }
  /** A patch coming from another tab: applied, logged, never put on this tab's undo stack. */
  function applyRemote(patches: Patch[]): void {
    const s = get();
    commit(s, applyPatches(s.portfolio, patches) as PortfolioDoc, { audit: log(s, 'remote', 'remote', 'Change from another tab') });
    emit('remote');
  }
  return {
    store, getState: get, subscribe: store.subscribe, dispatch, batch, undo: () => step('undo'), redo: () => step('redo'), jumpTo, load, applyRemote,
    onChange: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; },
    setHistory: (h: HistoryState) => store.setState({ history: h }),
  };
}
export type AppStore = ReturnType<typeof createAppStore>;
