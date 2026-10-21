import { appStore } from '@/store/instance';
import { restoreRecord, startAutosave, type AutosaveRecord, type AutosaveStorage } from '@/store/persistence/autosave';
import { connectBroadcast, type ChannelLike } from '@/store/persistence/broadcast';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { refitOnOpen } from './openFile';

export interface RestoreOffer { label: string; savedAt: string; steps: number }
let pending: AutosaveRecord | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

let offer: RestoreOffer | null = null;   // a stable object per pending record (useSyncExternalStore compares snapshots by identity)
const setPending = (r: AutosaveRecord | null) => { pending = r; offer = r ? { label: r.label, savedAt: r.savedAt, steps: r.history.undo.length } : null; notify(); };
export const getRestoreOffer = (): RestoreOffer | null => offer;
export const onRestoreOffer = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function acceptRestore(): void { if (pending) restoreRecord(appStore(), pending); setPending(null); }
export function dismissRestore(): void { setPending(null); }

export interface BootEnv { storage: AutosaveStorage | null; channel: ChannelLike | null; tabId: string; /** when the page was saved with a case inside: autosaves older than it are not offered */ embeddedSavedAt?: string }

/** A page saved by "Save HTML snapshot" carries its case: open it before anything else (autosave offers come after, and only for newer records). */
export function loadEmbeddedCase(d: Pick<Document, 'getElementById'>): { savedAt: string } | null {
  try {
    const c = readEmbeddedCase(d);
    if (c) appStore().load(refitOnOpen(c.doc));
    return c ? { savedAt: c.savedAt } : null;
  } catch (e) { console.error('The case embedded in this file could not be opened:', e); return null; }
}

/** Wire autosave and multi-tab sync; offer the newest session of another tab for restore. Returns a cleanup. */
export async function bootApp(env: BootEnv): Promise<() => void> {
  const stops: (() => void)[] = [];
  if (env.storage) {
    const others = (await env.storage.list()).filter((r) => r.tabId !== env.tabId && r.savedAt > (env.embeddedSavedAt ?? '')).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    setPending(others[0] ?? null);
    stops.push(startAutosave(appStore(), env.storage, env.tabId).stop);
  }
  if (env.channel) stops.push(connectBroadcast(appStore(), env.channel, env.tabId));
  return () => stops.forEach((s) => s());
}
