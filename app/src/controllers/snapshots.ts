import { compareCases, makeSnapshot, snapshotsOf, SNAPSHOT_KEY, type CompareRow, type NamedSnapshot } from '@/domain/snapshots';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';
import { refitOnOpen } from './openFile';
import { activatePortfolio, capturePortfolio, compareCaseOf, readableCapture } from './snapshotPortfolio';

const lib = (d: Doc): NamedSnapshot[] => d[SNAPSHOT_KEY] as NamedSnapshot[];
const ensure = (d: Doc): NamedSnapshot[] => { if (!Array.isArray(d[SNAPSHOT_KEY])) d[SNAPSHOT_KEY] = []; return lib(d); };
/** Replace the whole case (the library comes along inside `doc`). */
const replaceDoc = (d: Doc, doc: Doc): void => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, doc); };

const captureCmd = defineCommand<{ snap: NamedSnapshot }>({
  type: 'snapshots.capture', label: (p) => `Capture snapshot "${p.snap.name}"`, run(d, p) { ensure(d).push(p.snap); },
});
const renameCmd = defineCommand<{ id: string; name: string }>({
  type: 'snapshots.rename', label: (p) => `Rename snapshot to "${p.name}"`,
  run(d, p) { const s = ensure(d).find((x) => x.id === p.id); if (s && p.name.trim()) s.name = p.name.trim(); },
});
const deleteCmd = defineCommand<{ id: string; name: string }>({
  type: 'snapshots.delete', label: (p) => `Delete snapshot "${p.name}"`,
  run(d, p) { const l = ensure(d), i = l.findIndex((x) => x.id === p.id); if (i >= 0 && !l[i]!.protected) l.splice(i, 1); },
});
const activateCmd = defineCommand<{ name: string; doc: Doc }>({
  type: 'snapshots.activate', label: (p) => `Activate snapshot "${p.name}"`, run: (d, p) => replaceDoc(d, p.doc),
});
const baselineCmd = defineCommand<{ name: string; doc: Doc }>({
  type: 'snapshots.baseline', label: (p) => `Set snapshot "${p.name}" as baseline`, run: (d, p) => replaceDoc(d, p.doc),
});

const find = (id: string): NamedSnapshot | undefined => snapshotsOf(appStore().getState().doc).find((s) => s.id === id);
/** The stored case of a snapshot, opened like any case (fit-to-scope re-fit) but keeping the CURRENT library. */
function caseOf(s: NamedSnapshot, library: unknown): Doc { return refitOnOpen({ ...fromSnapshot(s.state), [SNAPSHOT_KEY]: library } as Doc); }

/** Capture the current case under a name (empty: "Snapshot <date>"). The library itself is not nested inside the capture. */
export function captureSnapshot(name: string, now = new Date(), id = `snap-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`): NamedSnapshot {
  const { doc, portfolio } = appStore().getState(), snap = makeSnapshot(doc, name, now, id), whole = capturePortfolio(portfolio);
  if (whole) snap.portfolio = whole;   // multi-product: the whole portfolio, so activating restores products, waves, overrides and hub
  appStore().dispatch(captureCmd({ snap }));
  return snap;
}
export const renameSnapshot = (id: string, name: string): void => appStore().dispatch(renameCmd({ id, name }));
export function deleteSnapshot(id: string): void { const s = find(id); if (s && !s.protected) appStore().dispatch(deleteCmd({ id, name: s.name })); }

/** Make a snapshot the working case. One Ctrl+Z brings the previous case (and the library as it was) back. */
export function activateSnapshot(id: string): boolean {
  const s = find(id), cur = appStore().getState().doc;
  if (!s) return false;
  if (s.portfolio) { if (!readableCapture(s)) return false; appStore().dispatch(activatePortfolio(s, cur[SNAPSHOT_KEY], false)); return true; }
  appStore().dispatch(activateCmd({ name: s.name, doc: caseOf(s, cur[SNAPSHOT_KEY]) }));
  return true;
}

/** Flag a snapshot as the (single) baseline and activate it. The file on disk only changes when the HTML snapshot is saved afterwards. */
export function setBaselineSnapshot(id: string): boolean {
  const s = find(id), cur = appStore().getState().doc;
  if (!s) return false;
  const flagged = snapshotsOf(cur).map((x) => ({ ...x, isBaseline: x.id === id }));
  if (s.portfolio) { if (!readableCapture(s)) return false; appStore().dispatch(activatePortfolio(s, flagged, true)); return true; }
  appStore().dispatch(baselineCmd({ name: s.name, doc: caseOf(s, flagged) }));
  return true;
}

/** Headline figures of two snapshots side by side; 'current' stands for the case being edited (the ACTIVE product). A multi-product capture is compared on that same product. Null when an id is unknown. */
export function compareSnapshots(a: string, b: string): CompareRow[] | null {
  const pick = (id: string): Doc | null => {
    if (id === 'current') return appStore().getState().doc;
    const s = find(id);
    return s ? compareCaseOf(s, appStore().getState().portfolio.activeProductId, fromSnapshot) : null;
  };
  const x = pick(a), y = pick(b);
  return x && y ? compareCases(x, y) : null;
}
