import { describe, expect, it } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setCustomerName } from '@/controllers/persona';
import { activateSnapshot, captureSnapshot, compareSnapshots, deleteSnapshot, renameSnapshot, setBaselineSnapshot } from '@/controllers/snapshots';
import { snapshotsOf, sortSnapshots, withVerTag } from '@/domain/snapshots';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { freshStore, snap } from './helpers';

const T0 = new Date('2026-10-21T10:00:00Z'), T1 = new Date('2026-10-21T11:00:00Z');
const lib = (s: ReturnType<typeof freshStore>) => snapshotsOf(s.getState().doc);

describe('snapshot manager', () => {
  it('captures the case under a name without nesting the library, and tags it with the build', () => {
    const s = freshStore();
    captureSnapshot('Client X', T0, 'a');
    captureSnapshot('', T1, 'b');   // empty name: dated default
    const [a, b] = lib(s);
    expect(a!.name).toMatch(/^Client X · v20/);
    expect(b!.name).toMatch(/^Snapshot .* · v20/);
    expect('namedSnapshots' in a!.state).toBe(false);
    expect(a!.state.savedAt).toBe(T0.toISOString());
    expect(fromSnapshot(a!.state).customerName).toBe(s.getState().doc.customerName);
    expect(withVerTag('Already v20.12', T0)).toBe('Already v20.12');
  });
  it('activating restores the captured case, keeps the library, and one undo brings the edits back', () => {
    const s = freshStore();
    captureSnapshot('Before', T0, 'a');
    setCustomerName('Edited'); setAgentSup('A017', 100);
    const edited = snap(s);
    expect(activateSnapshot('a')).toBe(true);
    const doc = s.getState().doc;
    expect(doc.customerName).not.toBe('Edited');
    expect(lib(s)).toHaveLength(1);
    expect(s.getState().history.undo.at(-1)!.label).toBe('Activate snapshot "Before · v20.12"');
    expect(s.undo()).toBe(true);
    expect(snap(s)).toBe(edited);
    expect(s.redo()).toBe(true);
    expect(s.getState().doc.customerName).toBe(doc.customerName);
    expect(activateSnapshot('missing')).toBe(false);
  });
  it('rename and delete are undoable; the golden case cannot be deleted', () => {
    const s = freshStore();
    captureSnapshot('One', T0, 'a');
    renameSnapshot('a', '  Renamed  ');
    expect(lib(s)[0]!.name).toBe('Renamed');
    renameSnapshot('a', '   ');   // blank names are ignored
    expect(lib(s)[0]!.name).toBe('Renamed');
    deleteSnapshot('a');
    expect(lib(s)).toHaveLength(0);
    s.undo();
    expect(lib(s)).toHaveLength(1);
    s.batch('golden', [{ type: 't', payload: 0, label: 'golden', undoable: true, run: (d) => { (d.namedSnapshots as { protected?: boolean }[])[0]!.protected = true; } }]);
    const n = s.getState().history.undo.length;
    deleteSnapshot('a');
    expect(lib(s)).toHaveLength(1);
    expect(s.getState().history.undo).toHaveLength(n);
  });
  it('baseline is exclusive, activates the snapshot, and is one undo step', () => {
    const s = freshStore();
    captureSnapshot('One', T0, 'a'); captureSnapshot('Two', T1, 'b');
    setBaselineSnapshot('a'); setBaselineSnapshot('b');
    expect(lib(s).map((x) => x.isBaseline)).toEqual([false, true]);
    s.undo();
    expect(lib(s).map((x) => x.isBaseline)).toEqual([true, false]);
  });
  it('orders golden first, then newest first', () => {
    const s = freshStore();
    captureSnapshot('Old', T0, 'a'); captureSnapshot('New', T1, 'b');
    expect(sortSnapshots(lib(s)).map((x) => x.id)).toEqual(['b', 'a']);
    expect(sortSnapshots([{ ...lib(s)[0]!, savedAt: '2000-01-01', protected: true }, ...lib(s).slice(1)]).map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('compares two snapshots, or one against the current case, without applying anything', () => {
    const s = freshStore();
    captureSnapshot('Default', T0, 'a');
    setAgentSup('A017', 100);
    captureSnapshot('Edited', T1, 'b');
    const before = snap(s);
    const rows = compareSnapshots('a', 'b')!;
    expect(rows.map((r) => r.id)).toEqual(['netSavY3', 'runCostY3', 'npv8', 'paybackMonths']);
    expect(rows.some((r) => r.delta !== null && r.delta !== 0)).toBe(true);
    expect(compareSnapshots('b', 'current')!.every((r) => r.delta === 0)).toBe(true);
    expect(compareSnapshots('a', 'nope')).toBeNull();
    expect(snap(s)).toBe(before);
  });
  it('skips malformed library entries instead of failing', () => {
    expect(snapshotsOf({ namedSnapshots: [null, 3, { id: 'x' }, { id: 'y', state: {} }] }).map((x) => x.id)).toEqual(['y']);
    expect(snapshotsOf({ namedSnapshots: 'oops' })).toEqual([]);
  });
});
