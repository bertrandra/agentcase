import { useCallback, useRef, useState, type RefObject } from 'react';
import type { Drawing } from '@/domain/process';

/**
 * Box selection (owner's request 2026-11-05): with "Select several" on, a drag that starts on the canvas's background (not on an activity, a link
 * or a handle) draws a box; the activities whose centre falls in it are added to the selection. Without it, the same drag pans the canvas.
 */
type Box = { x: number; y: number; w: number; h: number };
const SKIP = '.ac-bpmn-activity, .ac-bpmn-more, .ac-bpmn-handle, .ac-bpmn-edge-hit, .ac-bpmn-sub';

export function useBoxSelect(svg: RefObject<SVGSVGElement | null>, drawn: Drawing, on: boolean, onSelect: (ids: string[]) => void) {
  const [band, setBand] = useState<Box | null>(null), cur = useRef({ drawn, onSelect });
  cur.current = { drawn, onSelect };
  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const m = svg.current?.getScreenCTM?.();
    if (!on || e.button !== 0 || !m || (e.target as Element).closest?.(SKIP)) return;
    e.stopPropagation();   // the canvas does not pan
    const inv = m.inverse(), at = (cx: number, cy: number) => new DOMPoint(cx, cy).matrixTransform(inv), p0 = at(e.clientX, e.clientY);
    let b: Box | null = null;
    const move = (ev: PointerEvent): void => {
      const p = at(ev.clientX, ev.clientY);
      b = { x: Math.min(p0.x, p.x), y: Math.min(p0.y, p.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) };
      setBand(b);
    };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setBand(null);
      if (!b || b.w < 4 || b.h < 4) return;
      const r = b, ids = cur.current.drawn.shapes.filter((s) => s.kind === 'activity' && s.x + s.w / 2 >= r.x && s.x + s.w / 2 <= r.x + r.w
        && s.y + s.h / 2 >= r.y && s.y + s.h / 2 <= r.y + r.h).map((s) => s.id);
      if (ids.length) cur.current.onSelect(ids);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [svg, on]);
  return { band, onPointerDown };
}
