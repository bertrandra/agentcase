import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setInput } from '@/controllers/inputs';
import { computeCase } from '@/domain';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc } from '@/store/instance';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { connectBroadcast } from '@/store/persistence/broadcast';
import { channelPair } from '../helpers/channels';
import { fromSnapshot, sanitize, SnapshotError, toSnapshot } from '@/store/persistence/snapshot';
import { freshStore, snap } from './helpers';

describe('snapshot', () => {
  it('round-trips a document', () => {
    const doc = makeDefaultDoc(), back = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(doc))));
    expect(JSON.stringify(back)).toBe(JSON.stringify(doc));
  });
  it('loads every legacy fixture snapshot and computes the legacy figures from it', () => {
    const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', ''));
    expect(ids.length).toBeGreaterThanOrEqual(50);
    for (const id of ids) {
      const doc = fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')));
      const exp = JSON.parse(readFileSync(`fixtures/expected/${id}.json`, 'utf8'));
      const got = computeCase(doc).model.yearSav;
      got.forEach((v, i) => expect(Math.abs(v - exp.model.yearSav[i])).toBeLessThan(1e-6 * Math.max(1, Math.abs(v))));
    }
  });
  it('fills keys missing from an old snapshot with the current defaults', () => {
    const old = JSON.parse(JSON.stringify(toSnapshot(makeDefaultDoc()))) as Record<string, unknown>;
    delete old.lifecyclePos; delete old.TOKEN_MODELS;
    const doc = fromSnapshot(old);
    expect(doc.lifecyclePos).toBe(makeDefaultDoc().lifecyclePos);
    expect(doc.TOKEN_MODELS.length).toBeGreaterThan(0);
  });
  it('rejects non-objects and snapshots without inputs', () => {
    expect(() => fromSnapshot(null)).toThrow(SnapshotError);
    expect(() => fromSnapshot([1])).toThrow(SnapshotError);
    expect(() => fromSnapshot({ teamIn: [] })).toThrow(SnapshotError);
  });
  it('drops prototype-pollution keys', () => {
    const evil = JSON.parse('{"__proto__":{"polluted":1},"a":{"constructor":{"x":1},"ok":2}}');
    const clean = sanitize(evil) as Record<string, unknown>;
    expect(Object.keys(clean)).toEqual(['a']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const snapshot = JSON.parse(JSON.stringify(toSnapshot(makeDefaultDoc())));
    snapshot.__proto__ = { hacked: true }; Object.defineProperty(snapshot, 'constructor', { value: { x: 1 }, enumerable: true });
    expect(Object.keys(fromSnapshot(snapshot))).not.toContain('constructor');
  });
});

describe('autosave', () => {
  it('debounces, stores the document with its history, and restores both', async () => {
    const s = freshStore(() => 0), storage = memoryStorage(); let timer: (() => void) | null = null, set = 0;
    const a = startAutosave(s, storage, 'tab-1', { setTimer: (fn) => { set++; timer = fn; return set; }, clearTimer: () => { timer = null; } });
    setInput('y1Ramp', 30); setAgentSup('A017', 50);
    expect(set).toBe(2); expect(timer).not.toBeNull();   // a pending timer, restarted by each change
    await a.flush();
    const recs = await storage.list();
    expect(recs).toHaveLength(1); expect(recs[0]!.history.undo.length).toBe(2);
    const other = createAppStore(makeDefaultDoc());
    restoreRecord(other, recs[0]!);
    expect(JSON.stringify(other.getState().doc)).toBe(snap(s));
    expect(other.getState().history.undo).toHaveLength(2);
    expect(other.undo()).toBe(true);                       // Ctrl+Z works after a reload
    expect(other.getState().doc.dom.values.autoPotential).not.toBe(s.getState().doc.dom.values.autoPotential);
    a.stop();
  });
});

const pair = channelPair;
describe('multi-tab', () => {
  it('remote changes move the document but never the local undo stack', () => {
    const A = createAppStore(makeDefaultDoc(), { now: () => 0 }), B = createAppStore(makeDefaultDoc(), { now: () => 0 });
    const [ca, cb] = pair(); connectBroadcast(A, ca, 'A'); connectBroadcast(B, cb, 'B');
    const set = (s: typeof A, v: string) =>
      s.batch('x', [{ type: 'input.set', payload: v, label: 'x', undoable: true, run: (d) => { d.dom.values.y1Ramp = v; } }]);
    set(A, '41');
    expect(B.getState().doc.dom.values.y1Ramp).toBe('41');
    expect(B.getState().history.undo).toHaveLength(0);
    expect(B.undo()).toBe(false);
    A.undo();
    expect(B.getState().doc.dom.values.y1Ramp).toBe(makeDefaultDoc().dom.values.y1Ramp);
  });
});

describe('coalescing', () => {
  it('a slider drag is one undo step; a pause makes a new one', () => {
    let t = 0; const s = freshStore(() => t);
    for (const v of [10, 20, 30, 40]) { t += 100; setInput('y1Ramp', v); }
    expect(s.getState().history.undo).toHaveLength(1);
    t += 5000; setInput('y1Ramp', 50);
    expect(s.getState().history.undo).toHaveLength(2);
    s.undo(); expect(s.getState().doc.dom.values.y1Ramp).toBe('40');
    s.undo(); expect(s.getState().doc.dom.values.y1Ramp).toBe(makeDefaultDoc().dom.values.y1Ramp);
  });
});
