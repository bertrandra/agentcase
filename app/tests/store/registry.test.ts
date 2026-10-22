import { describe, expect, it } from 'vitest';
import.meta.glob('/src/controllers/*.ts', { eager: true });   // registers every command, so a new one cannot be forgotten
import { COMMAND_REGISTRY } from '@/store/commands';
import { threeProducts } from '../helpers/portfolioStore';
import { freshStore, snapAll as snap } from './helpers';

import type { Sample } from './samples/types';

// Each controller area owns tests/store/samples/<area>.ts exporting `samples`: one call per command type.
// Adding a command without a sample fails the completeness test below.
const mods = import.meta.glob('./samples/*.ts', { eager: true }) as Record<string, { samples?: Record<string, Sample> }>;
const SAMPLES: Record<string, Sample> = Object.assign({}, ...Object.values(mods).map((m) => m.samples ?? {}));

describe('command registry', () => {
  it('every registered command has a sample', () => expect(Object.keys(SAMPLES).sort()).toEqual([...COMMAND_REGISTRY.keys()].sort()));
  it.each(Object.keys(SAMPLES))('%s changes the document, has a label and round-trips through undo/redo', (type) => {
    const s = freshStore(), sample = SAMPLES[type]!;
    if (typeof sample !== 'function') sample.prep();
    const before = snap(s), steps = s.getState().history.undo.length;   // a prep may already have made undo steps
    (typeof sample === 'function' ? sample : sample.run)();
    const h = s.getState().history, last = h.undo[h.undo.length - 1];
    expect(snap(s)).not.toBe(before);
    if (!COMMAND_REGISTRY.get(type)!.undoable) { expect(h.undo.length).toBe(steps); return; }   // view commands: applied, never on the undo stack
    expect(last!.label.length).toBeGreaterThan(3);
    const after = snap(s);
    expect(s.undo()).toBe(true);
    expect(snap(s)).toBe(before);
    expect(s.redo()).toBe(true);
    expect(snap(s)).toBe(after);
  });

  it.each(Object.keys(SAMPLES))('%s round-trips through undo/redo on a 3-product, 2-wave portfolio (A6)', (type) => {
    const s = threeProducts().s, sample = SAMPLES[type]!;
    if (typeof sample !== 'function') sample.prep();
    const before = snap(s), steps = s.getState().history.undo.length;   // a prep may already have made undo steps
    (typeof sample === 'function' ? sample : sample.run)();
    const h = s.getState().history, last = h.undo[h.undo.length - 1];
    expect(snap(s)).not.toBe(before);
    if (!COMMAND_REGISTRY.get(type)!.undoable) { expect(h.undo.length).toBe(steps); return; }   // view commands: applied, never on the undo stack
    expect(last!.label.length).toBeGreaterThan(3);
    const after = snap(s);
    expect(s.undo()).toBe(true);
    expect(snap(s)).toBe(before);
    expect(s.redo()).toBe(true);
    expect(snap(s)).toBe(after);
  });
});
