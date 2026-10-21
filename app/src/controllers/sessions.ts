import { appStore } from '@/store/instance';
import { restoreRecord, startAutosave, type AutosaveRecord, type AutosaveStorage } from '@/store/persistence/autosave';
import { idbStorage } from '@/store/persistence/idb';

/** The sessions list shows at most this many records (the legacy autosave keeps the 20 most recent). */
export const SESSION_CAP = 20;

export interface SessionsEnv { storage: AutosaveStorage | null; tabId: string }
let env: SessionsEnv | null = null;

/** Wire the storage and the id of this tab (the same ones `bootApp` uses). Without it the controller opens IndexedDB itself with a tab id of its own. */
export function configureSessions(e: SessionsEnv | null): void { env = e; }
const current = (): SessionsEnv => (env ??= { storage: idbStorage(), tabId: crypto.randomUUID() });

export interface SessionInfo { tabId: string; label: string; savedAt: string; steps: number; isThisTab: boolean }
const info = (r: AutosaveRecord, me: string): SessionInfo => ({ tabId: r.tabId, label: r.label, savedAt: r.savedAt, steps: r.history.undo.length, isThisTab: r.tabId === me });

/** The id of this tab's autosave record. */
export const thisTabId = (): string => current().tabId;

/** False when this browser gives no access to IndexedDB (private mode): the section then explains it instead of listing. */
export const sessionsAvailable = (): boolean => current().storage !== null;

/** Autosaved sessions of this browser, newest first. */
export async function listSessions(): Promise<SessionInfo[]> {
  const { storage, tabId } = current();
  if (!storage) return [];
  return (await storage.list()).sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, SESSION_CAP).map((r) => info(r, tabId));
}

/** Restore a session: the case replaces the current one and that session's undo history comes back with it. */
export async function restoreSession(tabId: string): Promise<boolean> {
  const rec = (await current().storage?.list())?.find((r) => r.tabId === tabId);
  if (!rec) return false;
  restoreRecord(appStore(), rec);
  return true;
}

export async function removeSession(tabId: string): Promise<void> { await current().storage?.remove(tabId); }

/** Remove every autosaved session of this browser. Returns how many were removed. */
export async function clearAllSessions(): Promise<number> {
  const { storage } = current(), all = (await storage?.list()) ?? [];
  await Promise.all(all.map((r) => storage!.remove(r.tabId)));
  return all.length;
}

/** Write this tab's autosave record right now (instead of waiting for the debounce). */
export async function saveSessionNow(): Promise<void> {
  const { storage, tabId } = current();
  if (!storage) return;
  const a = startAutosave(appStore(), storage, tabId);
  try { await a.flush(); } finally { a.stop(); }
}
