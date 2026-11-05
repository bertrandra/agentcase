import { useCallback, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { Drawing } from '@/domain/process';

/**
 * The canvas from the keyboard (owner's request 2026-11-05): N / P select the next / previous activity (reading order: phase column, then top to
 * bottom) and bring it into view; Enter opens the selected activity's menu (edit, link, group, scope, delete; Edit details gives its phase and role,
 * the keyboard way to move it). Other keys go on to the camera (+ − 0, arrows).
 */
export function useCanvasKeys(svg: RefObject<SVGSVGElement | null>, drawn: Drawing, selected: string | null, act: {
  pick: (id: string) => void; menu: (id: string, x: number, y: number) => void; next: (e: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const cur = useRef({ drawn, selected, act });
  cur.current = { drawn, selected, act };
  return useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const { drawn: d, selected: sel, act: a } = cur.current, key = e.key.toLowerCase();
    if ((key === 'n' || key === 'p') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const acts = d.shapes.filter((s) => s.kind === 'activity').sort((x, y) => x.x - y.x || x.y - y.y);
      if (!acts.length) return;
      const i = acts.findIndex((s) => s.id === sel), to = acts[(i < 0 ? 0 : i + (key === 'n' ? 1 : acts.length - 1)) % acts.length]!;
      e.preventDefault();
      a.pick(to.id);
      return;
    }
    const s = d.shapes.find((x) => x.id === sel), m = svg.current?.getScreenCTM?.();
    if (e.key === 'Enter' && s && m) {
      e.preventDefault();
      const p = new DOMPoint(s.x + s.w, s.y + s.h).matrixTransform(m);
      a.menu(s.id, p.x, p.y);
      return;
    }
    a.next(e);
  }, [svg]);
}
