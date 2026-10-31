import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { FIT, panBy, pinch, viewOf, zoomAt, type Box, type Cam, type Pt } from './diagramCamera';

interface Gesture { cam: Cam; pts: Map<number, Pt>; start: Map<number, Pt>; anchor?: Pt }

/**
 * The diagram's camera and its inputs: + / − / 0 and the arrow keys on the focused frame, the wheel (zooms at the cursor), a one-finger or mouse drag
 * (pans) and a two-finger pinch on a touch screen (zooms at the fingers' midpoint, and pans with it). `toDrawing` maps a screen point to drawing units
 * through the SVG's own transform (null where the browser has none, e.g. jsdom: the zoom then keeps the centre).
 */
export function useCamera(b: Box, box: RefObject<HTMLDivElement | null>, svg: RefObject<SVGSVGElement | null>) {
  const [cam, setCam] = useState<Cam>(FIT), g = useRef<Gesture>({ cam: FIT, pts: new Map(), start: new Map() });
  const toDrawing = (p: Pt): Pt | undefined => {
    const m = svg.current?.getScreenCTM?.()?.inverse(), q = m && svg.current?.createSVGPoint?.();
    if (!m || !q) return undefined;
    q.x = p.x; q.y = p.y;
    const r = q.matrixTransform(m);
    return { x: r.x, y: r.y };
  };
  const zoom = (f: number, at?: Pt) => setCam((c) => zoomAt(b, c, f, at));
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, toDrawing({ x: e.clientX, y: e.clientY })); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
  const onKeyDown = (e: KeyboardEvent) => {
    const k: Record<string, () => void> = { '+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(0.8), '0': () => setCam(FIT),
      ArrowLeft: () => setCam((c) => panBy(b, c, -0.1, 0)), ArrowRight: () => setCam((c) => panBy(b, c, 0.1, 0)),
      ArrowUp: () => setCam((c) => panBy(b, c, 0, -0.1)), ArrowDown: () => setCam((c) => panBy(b, c, 0, 0.1)) };
    const f = k[e.key];
    if (f) { e.preventDefault(); f(); }
  };
  /** A new gesture from the fingers (or the mouse) down now: its start points, the camera then, the pinch anchor in drawing units. */
  const restart = () => {
    const x = g.current, [a, c] = [...x.pts.values()];
    x.start = new Map(x.pts); x.cam = cam;
    x.anchor = a && c ? toDrawing({ x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }) : undefined;
  };
  const onPointerDown = (e: PointerEvent) => { g.current.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); restart(); };
  const onPointerMove = (e: PointerEvent) => {
    const x = g.current, el = box.current;
    if (!x.pts.has(e.pointerId) || !el || (e.pointerType === 'mouse' && !(e.buttons & 1))) return;
    x.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ids = [...x.pts.keys()], k0 = viewOf(b, x.cam).w / Math.max(1, el.clientWidth);
    if (ids.length === 1) {
      const p = x.pts.get(ids[0]!)!, p0 = x.start.get(ids[0]!) ?? p;
      setCam({ ...x.cam, x: x.cam.x - (p.x - p0.x) * k0, y: x.cam.y - (p.y - p0.y) * k0 });
    } else if (ids.length === 2) {
      const [a, c] = ids.map((i) => x.pts.get(i)!), [a0, c0] = ids.map((i) => x.start.get(i) ?? x.pts.get(i)!);
      const p = pinch(a!, c!, a0!, c0!), p0 = pinch(a0!, c0!, a0!, c0!).mid, z = zoomAt(b, x.cam, p.f, x.anchor);
      const k = viewOf(b, z).w / Math.max(1, el.clientWidth);
      setCam({ ...z, x: z.x - (p.mid.x - p0.x) * k, y: z.y - (p.mid.y - p0.y) * k });
    }
  };
  const onPointerUp = (e: PointerEvent) => { g.current.pts.delete(e.pointerId); restart(); };
  const handlers = { onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onPointerLeave: onPointerUp };
  return { cam, setCam, zoom, handlers };
}
