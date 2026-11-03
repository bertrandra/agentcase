import { describe, expect, it } from 'vitest';
import { compactDrawing, drawingOf, hideActivities, type Drawing } from '@/domain/process';
import { opened } from '../../helpers/processCases';

/** The compact drawing (owner's request 2026-11-03): with the out-of-scope activities hidden, empty phases and lanes go and the empty bands close. */
const golden = (): Drawing => {
  const d = drawingOf(opened('golden').BPMN as never);
  return hideActivities(d, new Set(d.shapes.filter((s) => s.kind === 'activity' && s.inScope === false).map((s) => s.id)));
};
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('compactDrawing', () => {
  it('keeps every element shown, drops the empty phases and lanes, and shrinks the golden case to a fraction of its area', () => {
    const h = golden(), c = compactDrawing(h);
    const ids = (d: Drawing, k: string) => d.shapes.filter((s) => s.kind === k).map((s) => s.id);
    for (const k of ['activity', 'event', 'gateway', 'pool']) expect(ids(c, k)).toEqual(ids(h, k));
    expect(ids(c, 'phase').length).toBeLessThan(ids(h, 'phase').length);
    expect(ids(c, 'lane').length).toBeLessThan(ids(h, 'lane').length);
    expect(c.box.w * c.box.h).toBeLessThan((h.box.w * h.box.h) / 4);
    const kept = new Set(c.shapes.map((s) => s.id)), ends = (e: { source?: string; target?: string }) => [e.source, e.target].filter(Boolean) as string[];
    for (const e of c.edges) for (const x of ends(e)) expect(kept.has(x)).toBe(true);   // no flow to a dropped phase or lane
    for (const e of h.edges) if (ends(e).every((x) => kept.has(x))) expect(c.edges.some((f) => f.id === e.id)).toBe(true);
  });
  it('keeps the order and the sizes, and no two activities overlap', () => {
    const h = golden(), c = compactDrawing(h), by = new Map(c.shapes.map((s) => [s.id, s]));
    const acts = h.shapes.filter((s) => s.kind === 'activity');
    for (const a of acts) {
      const b = by.get(a.id)!;
      expect([b.w, b.h]).toEqual([a.w, a.h]);
      for (const o of acts) {
        if (o.id === a.id) continue;
        const p = by.get(o.id)!;
        if (o.x > a.x) expect(p.x).toBeGreaterThanOrEqual(b.x);
        if (o.y > a.y) expect(p.y).toBeGreaterThanOrEqual(b.y);
        expect(overlap(b, p)).toBe(false);
      }
    }
  });
  it('every activity stays inside its phase and lane; a drawing without empty space is unchanged in size', () => {
    const c = compactDrawing(golden()), inside = (s: { x: number; y: number; w: number; h: number }, box: typeof s) =>
      s.x >= box.x - 1e-6 && s.y >= box.y - 1e-6 && s.x + s.w <= box.x + box.w + 1e-6 && s.y + s.h <= box.y + box.h + 1e-6;
    for (const a of c.shapes.filter((s) => s.kind === 'activity')) {
      const ph = c.shapes.find((s) => s.kind === 'phase' && s.id === a.phase);
      if (ph) expect(inside(a, ph)).toBe(true);
      expect(c.shapes.some((s) => s.kind === 'lane' && inside(a, s))).toBe(true);
    }
    const tight: Drawing = { box: { x: 0, y: 0, w: 260, h: 120 }, edges: [],
      shapes: [{ id: 'a', kind: 'activity', x: 20, y: 20, w: 100, h: 80, label: 'a' },
        { id: 'b', kind: 'activity', x: 140, y: 20, w: 100, h: 80, label: 'b' }] };
    expect(compactDrawing(tight).shapes.map((s) => [s.x, s.y])).toEqual([[20, 20], [140, 20]]);
  });
});
