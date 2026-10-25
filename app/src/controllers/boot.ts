/** @calc-zone workspace-config */
import { appStore } from '@/store/instance';
import { restoreRecord, startAutosave, type AutosaveRecord, type AutosaveStorage } from '@/store/persistence/autosave';
import { connectBroadcast, type ChannelLike } from '@/store/persistence/broadcast';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { checkLoadedCase } from './calcStaleness';
import { setOpenNotes } from './openNotes';
import { refitPortfolio } from '@/store/derive';

export interface RestoreOffer { label: string; savedAt: string; steps: number }
let pending: AutosaveRecord | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

let offer: RestoreOffer | null = null;   // a stable object per pending record (useSyncExternalStore compares snapshots by identity)
const setPending = (r: AutosaveRecord | null) => {
  pending = r;
  offer = r ? { label: r.label, savedAt: r.savedAt, steps: r.format === 'portfolio' ? r.history.undo.length : 0 } : null;
  notify();
};
export const getRestoreOffer = (): RestoreOffer | null => offer;
export const onRestoreOffer = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function acceptRestore(): void {
  if (pending) { setOpenNotes(restoreRecord(appStore(), pending)); checkLoadedCase(pending.snapshot, appStore().getState().portfolio); }
  setPending(null);
}
export function dismissRestore(): void { setPending(null); }

export interface BootEnv { storage: AutosaveStorage | null; channel: ChannelLike | null; tabId: string;
  /** when the page was saved with a case inside: autosaves older than it are not offered */ embeddedSavedAt?: string }

/** A page saved by "Save HTML snapshot" carries its case: open it before anything else (autosave offers come after, and only for newer records). */
export function loadEmbeddedCase(d: Pick<Document, 'getElementById'>): { savedAt: string } | null {
  try {
    const c = readEmbeddedCase(d);
    if (c) { const pf = refitPortfolio(c.portfolio); appStore().load(pf); checkLoadedCase(c.raw, pf); setOpenNotes(c.notes); }
    return c ? { savedAt: c.savedAt } : null;
  } catch (e) { console.error('The case embedded in this file could not be opened:', e); return null; }
}

let flushNow: (() => Promise<void>) | null = null;
/** Write the autosave now instead of after its delay (the app-level error fallback calls it); a no-op without storage. */
export async function flushAutosave(): Promise<void> {
  try { await flushNow?.(); } catch (e) { console.error('AgentCase: the autosave could not be written:', e); }
}

/** Wire autosave and multi-tab sync; offer the newest session of another tab for restore. Returns a cleanup. */
export async function bootApp(env: BootEnv): Promise<() => void> {
  const stops: (() => void)[] = [];
  if (env.storage) {
    const others = (await env.storage.list()).filter((r) => r.tabId !== env.tabId && r.savedAt > (env.embeddedSavedAt ?? '')).sort((a,
      b) => b.savedAt.localeCompare(a.savedAt));
    setPending(others[0] ?? null);
    const autosave = startAutosave(appStore(), env.storage, env.tabId);
    flushNow = autosave.flush;
    stops.push(() => { autosave.stop(); flushNow = null; });
  }
  if (env.channel) stops.push(connectBroadcast(appStore(), env.channel, env.tabId));
  return () => stops.forEach((s) => s());
}
