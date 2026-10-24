import type { Patch } from 'immer';
import type { AppStore } from '../core';
import { documentPatches } from '../portfolioState';
import { SNAPSHOT_SCHEMA_VERSION } from './schema/version';

/** Minimal BroadcastChannel surface (so tests can inject a fake). */
export interface ChannelLike { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void }
/** `v`: the file schema version of the sending tab (absent: a build before v2, whose document shape is the same as v2). */
interface Msg { tabId: string; patches: Patch[]; v?: number }

/**
 * Multi-tab sync: every local change is broadcast as patches; a change from another tab is applied as a *remote* patch —
 * it moves the document but is never put on this tab's undo stack. A tab of a NEWER build (a newer file schema) is ignored: its patches may
 * address a shape this build does not know (each tab keeps its own document; saving from either still works).
 */
export function connectBroadcast(store: AppStore, ch: ChannelLike, tabId: string) {
  const off = store.onChange((kind, entry) => {
    if (!entry || kind === 'remote' || kind === 'load') return;
    const patches = documentPatches(kind === 'undo' ? entry.inverse : entry.patches);   // view state (active product, edit scope, persona) stays in its tab
    if (patches.length) ch.postMessage({ tabId, patches, v: SNAPSHOT_SCHEMA_VERSION } satisfies Msg);
  });
  ch.onmessage = (e) => {
    const m = e.data as Msg;
    if (!m || m.tabId === tabId || !Array.isArray(m.patches)) return;
    if ((Number.isInteger(m.v) ? (m.v as number) : 1) > SNAPSHOT_SCHEMA_VERSION) { console.warn('AgentCase: a change from a tab of a newer version was ignored'); return; }
    store.applyRemote(documentPatches(m.patches));
  };
  return () => { off(); ch.onmessage = null; ch.close(); };
}
