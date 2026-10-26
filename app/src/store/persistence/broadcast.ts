import type { Patch } from 'immer';
import type { Portfolio } from '@/domain/portfolio';
import type { AppStore, RemoteResult, SyncId } from '../core';
import { documentOf, documentPatches } from '../portfolioState';
import { SNAPSHOT_SCHEMA_VERSION } from './schema/version';

/** Minimal BroadcastChannel surface (so tests can inject a fake). */
export interface ChannelLike { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void }
/**
 * `v`: the file schema version of the sending tab. `docId` / `rev`: the sender's sync identity AFTER the change (`store/core.ts#SyncId`); a patch
 * was made at `base`. `full`: the sender's whole document (`reason` 'load': it opened one; 'sync': an out-of-step tab resyncs on it, `to` when it
 * answers a `request`). A message without a `docId` (a build before it) is ignored: nothing tells which document its patches address.
 */
type Body = (
  | { kind?: 'patch'; base?: number; patches: Patch[] }
  | { kind: 'full'; reason: 'load' | 'sync'; to?: string; portfolio: Portfolio }
  | { kind: 'request'; to: string });
type Msg = { tabId: string; v?: number; docId?: string; rev?: number } & Body;
/** A message on the channel (exported for the type-level check of `BROADCAST_FIELDS`). */
export type BroadcastMessage = Msg;
/** The message kinds and every field a message may carry, at runtime (the 🗄️ Data Model section lists them; a test keeps them equal to `Msg`). */
export const BROADCAST_KINDS = ['patch', 'full', 'request'] as const satisfies readonly NonNullable<Msg['kind']>[];
export const BROADCAST_FIELDS = ['tabId', 'v', 'docId', 'rev', 'kind', 'base', 'patches', 'reason', 'to', 'portfolio'] as const;

/** Messages a tab shows when another tab changed its document under it (an aria-live toast). */
export const SYNC_NOTICES = {
  opened: 'Another tab opened a document: this tab now shows it',
  resynced: 'This tab was out of step with another tab: it now shows the same document',
  structure: 'Another tab changed the products or waves',
  cleared: 'undo history cleared',
};
export interface BroadcastOptions { onNotice?: (text: string) => void }

/**
 * Multi-tab sync: every local change is broadcast as patches, tagged with the document id and revision; a change from another tab is applied as a
 * *remote* patch — it moves the document but is never put on this tab's undo stack — only on the same document at the same revision. Opening a
 * document broadcasts it whole: the other tabs replace theirs (keeping their own view state). A patch on another revision of the same document is a
 * divergence: the tab that is behind (lower revision, then lower tab id) takes the other one's whole document. A tab of a NEWER build (a newer file
 * schema) is ignored: its messages may address a shape this build does not know (each tab keeps its own document; saving from either still works).
 */
export function connectBroadcast(store: AppStore, ch: ChannelLike, tabId: string, o: BroadcastOptions = {}) {
  const post = (m: Body & SyncId) => ch.postMessage({ ...m, tabId, v: SNAPSHOT_SCHEMA_VERSION });
  const full = (reason: 'load' | 'sync', to?: string) => {
    const pf = store.getState().portfolio, portfolio = { ...documentOf(pf), activeProductId: pf.activeProductId } as unknown as Portfolio;
    post({ kind: 'full', reason, to, ...store.syncId(), portfolio });
  };
  const say = (what: string, r: RemoteResult) => { if (r.historyCleared || what !== SYNC_NOTICES.structure) o.onNotice?.(r.historyCleared ? `${what}: ${SYNC_NOTICES.cleared}` : what); };
  const ahead = (m: { tabId: string; rev?: number }, me: SyncId) => (m.rev ?? 0) > me.rev || ((m.rev ?? 0) === me.rev && m.tabId > tabId);
  const off = store.onChange((kind, entry) => {
    if (kind === 'remote') return;
    if (kind === 'load' || (kind === 'do' && entry?.type === 'doc.load')) { full('load'); return; }
    if (!entry) return;
    const patches = documentPatches(kind === 'undo' ? entry.inverse : entry.patches);   // view state (active product, edit scope, persona) stays in its tab
    if (patches.length) { const at = store.syncId(); post({ kind: 'patch', ...at, base: at.rev - 1, patches }); }
  });
  ch.onmessage = (e) => {
    const m = e.data as Msg | null;
    if (!m || typeof m !== 'object' || m.tabId === tabId || typeof m.docId !== 'string' || !Number.isInteger(m.rev)) return;
    if ((Number.isInteger(m.v) ? (m.v as number) : 1) > SNAPSHOT_SCHEMA_VERSION) { console.warn('AgentCase: a change from a tab of a newer version was ignored'); return; }
    const me = store.syncId(), at = { docId: m.docId, rev: m.rev as number };
    if (m.kind === 'request') { if (m.to === tabId && m.docId === me.docId) full('sync', m.tabId); return; }
    if (m.kind === 'full') {
      if (m.reason === 'load') { const r = store.replaceRemote(m.portfolio, at); if (r.applied) say(SYNC_NOTICES.opened, r); return; }
      if (m.docId !== me.docId || (m.to !== tabId && !ahead(m, me))) return;
      const r = store.replaceRemote(m.portfolio, at);
      if (r.applied) say(SYNC_NOTICES.resynced, r);
      return;
    }
    if (!Array.isArray(m.patches) || m.docId !== me.docId) return;   // another document: never applied to this one
    if (m.base === me.rev) {
      const r = store.applyRemote(documentPatches(m.patches), at);
      if (r.applied) say(SYNC_NOTICES.structure, r); else post({ kind: 'request', to: m.tabId, ...me });
      return;
    }
    if (ahead(m, me)) post({ kind: 'request', to: m.tabId, ...me }); else full('sync');
  };
  return () => { off(); ch.onmessage = null; ch.close(); };
}
