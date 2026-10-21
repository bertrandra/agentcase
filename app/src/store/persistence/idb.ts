import type { AutosaveRecord, AutosaveStorage } from './autosave';

const DB = 'agentcase-v19', STORE = 'autosave';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'tabId' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const wrap = <T,>(r: IDBRequest<T>): Promise<T> => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/** IndexedDB-backed autosave storage; null when IndexedDB is unavailable (private mode, tests) so callers can fall back. */
export function idbStorage(): AutosaveStorage | null {
  if (typeof indexedDB === 'undefined') return null;
  const tx = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode).objectStore(STORE);
  return {
    put: async (r) => { await wrap((await tx('readwrite')).put(r)); },
    list: async () => (await wrap((await tx('readonly')).getAll())) as AutosaveRecord[],
    remove: async (id) => { await wrap((await tx('readwrite')).delete(id)); },
  };
}
