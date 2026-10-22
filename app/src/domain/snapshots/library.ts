/** @calc-zone exports */
import { APP_VERSION } from '../version';
import type { NamedSnapshot } from './types';

export const SNAPSHOT_KEY = 'namedSnapshots';

/** The library of a document: malformed entries (a hand-edited file) are skipped instead of breaking the screen. */
export function snapshotsOf(doc: Record<string, unknown>): NamedSnapshot[] {
  const raw = doc[SNAPSHOT_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is NamedSnapshot => !!s && typeof s === 'object' && typeof (s as NamedSnapshot).id === 'string'
    && typeof (s as NamedSnapshot).state === 'object' && (s as NamedSnapshot).state !== null);
}

/** Display tag of the build, legacy appVerTag(): "v20.3" (a trailing ".0" is dropped as in "v18.11"). */
export const appVerTag = (): string => 'v' + APP_VERSION.replace(/\.0+$/, '');
export const appVerFileTag = (): string => appVerTag().replace(/\./g, '_');

/** Legacy withVerTag(): the name gets " · v20…" appended unless it already carries it. */
export function withVerTag(name: string | null, now: Date): string {
  const t = appVerTag(), base = name || `Snapshot ${now.toLocaleString('en-GB')}`;
  return base.includes(t) ? base : `${base} · ${t}`;
}

/** The case as stored in a snapshot: everything except the library itself. Shares (immutable) sub-objects with the document. */
export function captureState(doc: Record<string, unknown>, now: Date): Record<string, unknown> {
  const rest = { ...doc };
  delete rest[SNAPSHOT_KEY];
  return { ...rest, savedAt: now.toISOString() };
}

export function makeSnapshot(doc: Record<string, unknown>, name: string | null, now: Date, id: string): NamedSnapshot {
  return { id, name: withVerTag(name?.trim() || null, now), savedAt: now.toISOString(), isBaseline: false, state: captureState(doc, now) };
}

/** Golden case first, the AME reference second, then newest first (legacy order). */
export function sortSnapshots(list: NamedSnapshot[]): NamedSnapshot[] {
  return list.slice().sort((a, b) => {
    if (!!a.protected !== !!b.protected) return a.protected ? -1 : 1;
    if (!!a.isAmeRef !== !!b.isAmeRef) return a.isAmeRef ? -1 : 1;
    return b.savedAt.localeCompare(a.savedAt);
  });
}

const sizes = new WeakMap<object, string>();
/** "277 KB" — serialised size of a snapshot (memoised per state object: it is immutable). */
export function snapshotSize(s: NamedSnapshot): string {
  let v = sizes.get(s.state);
  if (!v) { const n = JSON.stringify(s.state).length + (s.portfolio ? JSON.stringify(s.portfolio).length : 0); v = n > 1024 ? `${(n / 1024).toFixed(0)} KB` : `${n} B`; sizes.set(s.state, v); }
  return v;
}
