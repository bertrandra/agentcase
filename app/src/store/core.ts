import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import { createStore } from 'zustand/vanilla';
import { EMPTY_HISTORY, popRedo, popUndo, pushEntry } from './history';
import type { AuditRecord, Command, Doc, HistoryEntry, HistoryState } from './types';

enablePatches();

export interface StoreOptions { now?: () => number; coalesceMs?: number; cap?: number; auditCap?: number }
export interface AppStoreState { doc: Doc; history: HistoryState; audit: AuditRecord[]; rev: number }
type Listener = (kind: AuditRecord['kind'], entry?: HistoryEntry) => void;

/** The single write path: dispatch(command) → Immer patches → history → subscribers. */
export function createAppStore(initial: Doc, opts: StoreOptions = {}) {
  const now = opts.now ?? Date.now, auditCap = opts.auditCap ?? 500;
  const store = createStore<AppStoreState>(() => ({ doc: initial, history: EMPTY_HISTORY, audit: [], rev: 0 }));
  const listeners = new Set<Listener>();
  const get = () => store.getState();
  const log = (s: AppStoreState, kind: AuditRecord['kind'], type: string, label: string): AuditRecord[] =>
    [...s.audit, { ts: now(), type, label, kind }].slice(-auditCap);
  const emit = (kind: AuditRecord['kind'], e?: HistoryEntry) => listeners.forEach((l) => l(kind, e));

  /** Apply several commands as ONE history step. */
  function batch(label: string, cmds: Command[], coalesceKey?: string): void {
    const s = get();
    const [doc, patches, inverse] = produceWithPatches(s.doc, (d) => { cmds.forEach((c) => c.run(d as Doc, c.payload)); });
    if (!patches.length) return;
    const undoable = cmds.some((c) => c.undoable);
    const entry: HistoryEntry = { label, type: cmds.length === 1 ? (cmds[0] as Command).type : 'batch', ts: now(), coalesceKey, patches, inverse };
    store.setState({ doc, rev: s.rev + 1, history: undoable ? pushEntry(s.history, entry, opts.coalesceMs, opts.cap) : s.history,
      audit: log(s, 'do', entry.type, label) });
    emit('do', entry);
  }
  const dispatch = <P>(cmd: Command<P>): void => batch(cmd.label, [cmd as Command], cmd.coalesceKey);

  function step(dir: 'undo' | 'redo'): boolean {
    const s = get(), r = dir === 'undo' ? popUndo(s.history) : popRedo(s.history);
    if (!r) return false;
    const doc = applyPatches(s.doc, dir === 'undo' ? r.entry.inverse : r.entry.patches) as Doc;
    store.setState({ doc, rev: s.rev + 1, history: r.next, audit: log(s, dir, r.entry.type, r.entry.label) });
    emit(dir, r.entry);
    return true;
  }
  /** Undo/redo until `index` steps remain on the undo stack (history-panel jump). */
  function jumpTo(index: number): void {
    while (get().history.undo.length > index && step('undo')) { /* undo */ }
    while (get().history.undo.length < index && step('redo')) { /* redo */ }
  }
  /** Replace the whole document (open a case). `keepHistory` makes it an undoable step instead of a fresh start. */
  function load(doc: Doc, keepHistory = false): void {
    const s = get();
    if (!keepHistory) { store.setState({ doc, rev: s.rev + 1, history: EMPTY_HISTORY, audit: log(s, 'load', 'doc.load', 'Open case') }); emit('load'); return; }
    batch('Open case', [{ type: 'doc.load', payload: doc, label: 'Open case', undoable: true, run: (d: Doc) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, doc); } }]);
  }
  /** A patch coming from another tab: applied, logged, never put on this tab's undo stack. */
  function applyRemote(patches: Patch[]): void {
    const s = get();
    store.setState({ doc: applyPatches(s.doc, patches) as Doc, rev: s.rev + 1, audit: log(s, 'remote', 'remote', 'Change from another tab') });
    emit('remote');
  }
  return {
    store, getState: get, subscribe: store.subscribe, dispatch, batch, undo: () => step('undo'), redo: () => step('redo'), jumpTo, load, applyRemote,
    onChange: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; },
    setHistory: (h: HistoryState) => store.setState({ history: h }),
  };
}
export type AppStore = ReturnType<typeof createAppStore>;
