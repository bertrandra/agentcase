import type { Drawing } from '@/domain/process';

/**
 * The camera of the process diagram (view state, never in the case): a zoom factor `s` (1 = the whole drawing fits) and the offset of the visible
 * window from the drawing's top-left corner, in drawing units. Pure functions, shared by the buttons, the keyboard, the wheel, a pinch and the
 * "zoom to selection" action.
 */
export interface Cam { s: number; x: number; y: number }
export type Box = Drawing['box'];
export interface Pt { x: number; y: number }
export const FIT: Cam = { s: 1, x: 0, y: 0 };
export const MAX_ZOOM = 40;
export const clampS = (s: number): number => Math.min(MAX_ZOOM, Math.max(1, s));

/** The view box the SVG shows for a camera. */
export const viewOf = (b: Box, c: Cam): Box => ({ x: b.x + c.x, y: b.y + c.y, w: b.w / c.s, h: b.h / c.s });

/** Zoom by `f`, keeping the drawing point `at` where it is on screen (the centre of the view when omitted). */
export function zoomAt(b: Box, c: Cam, f: number, at?: Pt): Cam {
  const v = viewOf(b, c), p = at ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 }, s = clampS(c.s * f), k = c.s / s;
  return { s, x: p.x - (p.x - v.x) * k - b.x, y: p.y - (p.y - v.y) * k - b.y };
}

/** Pan by a share of the visible window (0.1 = a tenth of it). */
export const panBy = (b: Box, c: Cam, dx: number, dy: number): Cam => ({ ...c, x: c.x + (dx * b.w) / c.s, y: c.y + (dy * b.h) / c.s });

/** The camera centred on `p` at zoom `s`. */
export const centreOn = (b: Box, p: Pt, s: number): Cam => ({ s, x: p.x - b.x - b.w / s / 2, y: p.y - b.y - b.h / s / 2 });

/**
 * Zoom to a set of shapes: the camera that fits their bounding box (with a margin), centred on it, but never below `readable` (the zoom from which
 * labels are drawn): shapes far apart are centred at a readable zoom rather than shown too small to read. Null when there is nothing to fit.
 */
export function fitTo(b: Box, shapes: readonly Box[], readable: number, margin = 24): Cam | null {
  if (!shapes.length) return null;
  const x0 = Math.min(...shapes.map((s) => s.x)) - margin, y0 = Math.min(...shapes.map((s) => s.y)) - margin;
  const x1 = Math.max(...shapes.map((s) => s.x + s.w)) + margin, y1 = Math.max(...shapes.map((s) => s.y + s.h)) + margin;
  const fit = Math.min(b.w / (x1 - x0), b.h / (y1 - y0));
  return centreOn(b, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, clampS(Math.max(fit, readable)));
}

/** A pinch: the zoom factor between two finger distances, and the midpoint of the fingers. */
export function pinch(a: Pt, b: Pt, a0: Pt, b0: Pt): { f: number; mid: Pt } {
  const d = Math.hypot(a.x - b.x, a.y - b.y), d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y);
  return { f: d0 > 0 ? d / d0 : 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}
