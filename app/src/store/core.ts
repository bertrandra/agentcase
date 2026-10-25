import { applyPatches, enablePatches, type Patch } from 'immer';
import { createStore } from 'zustand/vanilla';
import type { Portfolio } from '@/domain/portfolio';
import { structuralEqual } from './equal';
import { EMPTY_HISTORY, invalidatesHistory, popRedo, popUndo, pushEntry } from './history';
import { keepTabView, liftPersona } from './persona';
import { asPortfolio, deriveDoc, documentOf, documentPatches, keepHighWater, normalizeActive, runCommands } from './portfolioState';
import type { AuditRecord, Command, Doc, HistoryEntry, HistoryState, PortfolioDoc } from './types';

enablePatches();

export interface StoreOptions { now?: () => number; coalesceMs?: number; cap?: number; auditCap?: number }
/**
 * `portfolio` is the source of truth (history, audit, autosave and broadcast patches are on it); `doc` is DERIVED from it: the effective
 * case of the active product, so every selector and controller written for a single case keeps working unchanged.
 */
export interface AppStoreState { portfolio: PortfolioDoc; doc: Doc; history: HistoryState; audit: AuditRecord[]; rev: number }
type Listener = (kind: AuditRecord['kind'], entry?: HistoryEntry) => void;
/**
 * SYNC IDENTITY of the document (multi-tab sync, `persistence/broadcast.ts`): `docId` changes whenever a document is opened (every tab starts on the
 * shared `INITIAL_DOC_ID`, the default case); `rev` counts its document changes since. A remote patch lands only on the same `docId` at the revision
 * it was made on; anything else is a divergence, resolved by a full replacement.
 */
export interface SyncId { docId: string; rev: number }
export const INITIAL_DOC_ID = 'initial';
const newDocId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
/** A change from another tab: `applied` false when nothing changed (it did not fit, or was the same document); `historyCleared` when the local
 * undo / redo stacks were dropped (their patches address products and waves by position, which the change moved). */
export interface RemoteResult { applied: boolean; historyCleared: boolean }

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
  let sync: SyncId = { docId: INITIAL_DOC_ID, rev: 0 };
  const moved = (patches: Patch[], opened = false) => {
    if (opened) sync = { docId: newDocId(), rev: 0 }; else if (patches.length) sync = { ...sync, rev: sync.rev + 1 };
  };
  const hasHistory = (s: AppStoreState) => s.history.undo.length > 0 || s.history.redo.length > 0;
  /** Commit a new portfolio: the derived case follows; the high-water marks never go back and the case never holds the persona (a document opened aside). */
  const commit = (s: AppStoreState, portfolio: PortfolioDoc, rest: Partial<AppStoreState>, fresh = false) => {
    const pf = normalizeActive(fresh ? portfolio : liftPersona(keepHighWater(s.portfolio, portfolio), false));
    store.setState({ portfolio: pf, doc: deriveDoc(pf), rev: s.rev + 1, ...rest });
  };

  /** Apply several commands as ONE history step. View state (`VIEW_FIELDS`) is applied but never part of the step: it is never undone. */
  function batch(label: string, cmds: Command[], coalesceKey?: string): void {
    const s = get(), [pf, all, allInverse] = runCommands(s.portfolio, cmds);
    if (!all.length) return;
    const patches = documentPatches(all), inverse = documentPatches(allInverse), undoable = patches.length > 0 && cmds.some((c) => c.undoable);
    const entry: HistoryEntry = { label, type: cmds.length === 1 ? (cmds[0] as Command).type : 'batch', ts: now(), coalesceKey, patches, inverse };
    moved(patches, entry.type === 'doc.load' && patches.length > 0);
    commit(s, pf, { history: undoable ? pushEntry(s.history, entry, opts.coalesceMs, opts.cap) : s.history, audit: log(s, 'do', entry.type, label) }, entry.type === 'doc.load');
    emit('do', entry);
  }
  const dispatch = <P>(cmd: Command<P>): void => batch(cmd.label, [cmd as Command], cmd.coalesceKey);

  function step(dir: 'undo' | 'redo'): boolean {
    const s = get(), r = dir === 'undo' ? popUndo(s.history) : popRedo(s.history);
    if (!r) return false;
    moved(dir === 'undo' ? r.entry.inverse : r.entry.patches);
    commit(s, applyPatches(s.portfolio, dir === 'undo' ? r.entry.inverse : r.entry.patches) as PortfolioDoc, { history: r.next, audit: log(s, dir, r.entry.type, r.entry.label) });
    emit(dir, r.entry);
    return true;
  }
  /** Undo/redo until `index` steps remain on the undo stack (history-panel jump). */
  function jumpTo(index: number): void {
    while (get().history.undo.length > index && step('undo')) { /* undo */ }
    while (get().history.undo.length < index && step('redo')) { /* redo */ }
  }
  /**
   * Replace the whole document (open a case or a portfolio). `keepHistory` makes it an undoable step instead of a fresh start. The tab then shows the
   * persona the file opens on (its `currentPersona`; none: the tab keeps its own), outside the undo step: undoing the open keeps the persona.
   */
  function load(input: Doc | PortfolioDoc, keepHistory = false): void {
    const s = get(), opened = asPortfolio(input), persona = opened.persona ?? s.portfolio.persona;
    if (!keepHistory) {
      moved([], true);
      commit(s, liftPersona(opened, false, persona), { history: EMPTY_HISTORY, audit: log(s, 'load', 'doc.load', 'Open case') }, true);
      emit('load');
      return;
    }
    const next: PortfolioDoc = { ...opened };
    if (s.portfolio.persona === undefined) delete next.persona; else next.persona = s.portfolio.persona;
    const replace = (d: PortfolioDoc) => { Object.keys(d).forEach((k) => delete (d as unknown as Record<string, unknown>)[k]); Object.assign(d, next); };
    batch('Open case', [{ type: 'doc.load', payload: next, label: 'Open case', undoable: true, run: () => undefined, runPortfolio: replace }]);
    if (persona !== undefined && get().portfolio.persona !== persona) commit(get(), { ...get().portfolio, persona }, {});
  }
  /**
   * A patch coming from another tab (`at`: the sender's sync identity after it): applied, logged, never put on this tab's undo stack. A patch that
   * moves products or waves clears the local undo / redo (index-based). One that does not fit is refused whole: nothing changes.
   */
  function applyRemote(patches: Patch[], at?: SyncId): RemoteResult {
    const s = get();
    let pf: PortfolioDoc;
    try { pf = applyPatches(s.portfolio, patches) as PortfolioDoc; } catch (e) {
      console.warn('AgentCase: a change from another tab did not fit this document', e);
      return { applied: false, historyCleared: false };
    }
    const historyCleared = invalidatesHistory(patches) && hasHistory(s);
    commit(s, pf, { audit: log(s, 'remote', 'remote', 'Change from another tab'), ...(historyCleared ? { history: EMPTY_HISTORY } : {}) });
    sync = at ? { ...at } : { ...sync, rev: sync.rev + 1 };
    emit('remote');
    return { applied: true, historyCleared };
  }
  /**
   * The whole document of another tab (it opened a document, or this tab was out of step) replaces this one. This tab keeps its view state
   * (`keepTabView`; its active product when the new document has it); its undo / redo go (they address the previous document) unless nothing changed.
   */
  function replaceRemote(next: Portfolio, at: SyncId): RemoteResult {
    const s = get();
    sync = { ...at };
    if (structuralEqual(documentOf(s.portfolio), documentOf(next))) return { applied: false, historyCleared: false };
    const keep = next.products.some((p) => p.id === s.portfolio.activeProductId) ? s.portfolio.activeProductId : next.activeProductId;
    const historyCleared = hasHistory(s);
    commit(s, keepTabView(s.portfolio, { ...next, activeProductId: keep }), { history: EMPTY_HISTORY, audit: log(s, 'remote', 'remote', 'Document from another tab') });
    emit('remote');
    return { applied: true, historyCleared };
  }
  return {
    store, getState: get, subscribe: store.subscribe, dispatch, batch, undo: () => step('undo'), redo: () => step('redo'), jumpTo, load, applyRemote,
    replaceRemote, syncId: (): SyncId => ({ ...sync }),
    onChange: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; },
    setHistory: (h: HistoryState) => store.setState({ history: h }),
  };
}
export type AppStore = ReturnType<typeof createAppStore>;
