import { appStore } from '@/store/instance';
import { restoreRecord, startAutosave, type AutosaveRecord, type AutosaveStorage } from '@/store/persistence/autosave';
import { connectBroadcast, type ChannelLike } from '@/store/persistence/broadcast';

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

export interface BootEnv { storage: AutosaveStorage | null; channel: ChannelLike | null; tabId: string }

/** Wire autosave and multi-tab sync; offer the newest session of another tab for restore. Returns a cleanup. */
export async function bootApp(env: BootEnv): Promise<() => void> {
  const stops: (() => void)[] = [];
  if (env.storage) {
    const others = (await env.storage.list()).filter((r) => r.tabId !== env.tabId).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    setPending(others[0] ?? null);
    stops.push(startAutosave(appStore(), env.storage, env.tabId).stop);
  }
  if (env.channel) stops.push(connectBroadcast(appStore(), env.channel, env.tabId));
  return () => stops.forEach((s) => s());
}
