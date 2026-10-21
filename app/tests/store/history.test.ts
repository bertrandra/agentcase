import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, EMPTY_HISTORY, popRedo, popUndo, pushEntry } from '@/store/history';
import type { HistoryEntry } from '@/store/types';

const e = (label: string, ts: number, key?: string): HistoryEntry => ({ label, type: 't', ts, coalesceKey: key, patches: [{ op: 'replace', path: ['a'], value: ts }], inverse: [{ op: 'replace', path: ['a'], value: -ts }] });

describe('history', () => {
  it('pushes, undoes and redoes', () => {
    let h = pushEntry(EMPTY_HISTORY, e('one', 1));
    h = pushEntry(h, e('two', 2));
    expect(canUndo(h)).toBe(true);
    const u = popUndo(h)!; expect(u.entry.label).toBe('two'); expect(canRedo(u.next)).toBe(true);
    const r = popRedo(u.next)!; expect(r.entry.label).toBe('two'); expect(r.next.undo).toHaveLength(2);
  });
  it('a new step clears redo', () => {
    let h = pushEntry(EMPTY_HISTORY, e('one', 1)); h = popUndo(h)!.next;
    expect(h.redo).toHaveLength(1);
    expect(pushEntry(h, e('two', 5)).redo).toHaveLength(0);
  });
  it('coalesces the same key inside the window only', () => {
    let h = pushEntry(EMPTY_HISTORY, e('a', 100, 'k'));
    h = pushEntry(h, e('b', 500, 'k'));
    expect(h.undo).toHaveLength(1);
    expect(h.undo[0]!.patches).toHaveLength(2);
    expect(h.undo[0]!.inverse.map((p) => p.value)).toEqual([-500, -100]);   // inverse is applied newest-first
    h = pushEntry(h, e('c', 5000, 'k'));
    expect(h.undo).toHaveLength(2);
    expect(pushEntry(h, e('d', 5100, 'other')).undo).toHaveLength(3);
  });
  it('caps the stack', () => {
    let h = EMPTY_HISTORY;
    for (let i = 0; i < 10; i++) h = pushEntry(h, e('x' + i, i * 10000), 800, 4);
    expect(h.undo.map((x) => x.label)).toEqual(['x6', 'x7', 'x8', 'x9']);
  });
});
