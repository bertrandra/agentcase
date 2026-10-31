import { describe, expect, it } from 'vitest';
import { centreOn, clampS, FIT, fitTo, MAX_ZOOM, pinch, viewOf, zoomAt } from '@/ui/sections/scope/process/diagramCamera';

/** The camera of the 🧩 Process diagram: zoom at a point (wheel, pinch), zoom to a selection at a readable zoom, pinch factor. */
const B = { x: 0, y: 0, w: 1000, h: 500 };

describe('process diagram camera', () => {
  it('zooms at a point: that point stays where it is on screen', () => {
    const p = { x: 800, y: 100 }, c = zoomAt(B, FIT, 2, p), v0 = viewOf(B, FIT), v1 = viewOf(B, c);
    expect(c.s).toBe(2);
    expect((p.x - v1.x) / v1.w).toBeCloseTo((p.x - v0.x) / v0.w, 12);
    expect((p.y - v1.y) / v1.h).toBeCloseTo((p.y - v0.y) / v0.h, 12);
  });
  it('without a point, keeps the centre; the zoom stays between 1 and the maximum', () => {
    const v = viewOf(B, zoomAt(B, FIT, 4));
    expect(v.x + v.w / 2).toBeCloseTo(500, 9);
    expect(v.y + v.h / 2).toBeCloseTo(250, 9);
    expect(clampS(0.2)).toBe(1);
    expect(clampS(1e6)).toBe(MAX_ZOOM);
  });
  it('fits a selection centred on it, never below the readable zoom; nothing to fit gives null', () => {
    const near = [{ x: 100, y: 100, w: 100, h: 70 }, { x: 240, y: 100, w: 100, h: 70 }];
    const c = fitTo(B, near, 2)!, v = viewOf(B, c);
    expect(v.x + v.w / 2).toBeCloseTo(220, 9);
    expect(v.y + v.h / 2).toBeCloseTo(135, 9);
    expect(c.s).toBeCloseTo(Math.min(1000 / 288, 500 / 118), 9);   // the bounding box with its 24-unit margin fits
    const far = [{ x: 0, y: 0, w: 100, h: 70 }, { x: 900, y: 400, w: 100, h: 70 }];
    expect(fitTo(B, far, 2)!.s).toBe(2);   // too far apart to fit readably: centred at the readable zoom
    expect(fitTo(B, [], 2)).toBeNull();
    expect(centreOn(B, { x: 500, y: 250 }, 1)).toEqual(FIT);
  });
  it('a pinch zooms by the ratio of the finger distances, at their midpoint', () => {
    const p = pinch({ x: 0, y: 0 }, { x: 300, y: 400 }, { x: 100, y: 100 }, { x: 200, y: 100 });
    expect(p.f).toBe(5);
    expect(p.mid).toEqual({ x: 150, y: 200 });
    expect(pinch({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }).f).toBe(1);
  });
});
