import type { Patch } from 'immer';
import type { AppStore } from '../core';

/** Minimal BroadcastChannel surface (so tests can inject a fake). */
export interface ChannelLike { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void }
interface Msg { tabId: string; patches: Patch[] }

/**
 * Multi-tab sync: every local change is broadcast as patches; a change from another tab is applied as a *remote* patch —
 * it moves the document but is never put on this tab's undo stack.
 */
export function connectBroadcast(store: AppStore, ch: ChannelLike, tabId: string) {
  const off = store.onChange((kind, entry) => {
    if (!entry || kind === 'remote' || kind === 'load') return;
    ch.postMessage({ tabId, patches: kind === 'undo' ? entry.inverse : entry.patches } satisfies Msg);
  });
  ch.onmessage = (e) => {
    const m = e.data as Msg;
    if (m && m.tabId !== tabId && Array.isArray(m.patches)) store.applyRemote(m.patches);
  };
  return () => { off(); ch.onmessage = null; ch.close(); };
}
