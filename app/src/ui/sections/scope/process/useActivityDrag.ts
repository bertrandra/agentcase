import { useCallback, useRef, useState, type RefObject } from 'react';
import { placeProcessActivities } from '@/controllers/processCanvas';
import { placeProcessActivity } from '@/controllers/processLayout';
import { addToProcessSub } from '@/controllers/processSubs';
import type { Drawing } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { cellAt } from './DiagramEdit';

/**
 * Dragging activities on the canvas (owner's requests 2026-11-04 / 05). `onDrag` (stable) starts on a pointer down on an activity; past 5 px a
 * ghost follows the pointer, the cell under it is highlighted with what the drop will do ("→ phase · lane", "→ sub-process"), and the drop places
 * the activity there, or every selected activity when it is one of them (one step). On a touch screen a finger on an activity that is not
 * selected pans the canvas (select it first to drag it), and a long press opens its menu. `moved` tells the click that ends a gesture not to select.
 */
type Box = { x: number; y: number; w: number; h: number };
export interface Ghost extends Box { id: string; n: number; target?: { box: Box; label: string } }
export interface DragOptions {
  onEdited?: (id: string) => void;
  /** the selected activities (the group a drag moves when it starts on one of them) */
  group: () => string[];
  /** a long press (touch): open the activity's menu at that point */
  onLong: (id: string, cx: number, cy: number) => void;
}
const LONG_MS = 500;

/** What a drop at the ghost's centre does, and the box it lands in (a sub-process, or the phase × lane cell). */
function targetOf(d: Drawing, g: Box): Ghost['target'] {
  const c = cellAt(d, g.x + g.w / 2, g.y + g.h / 2);
  if (!c) return undefined;
  const find = (id: string) => d.shapes.find((s) => s.id === id);
  if (c.sub) { const s = find(c.sub)!; return { box: s, label: `→ ${s.label || s.id}` }; }
  const ph = find(c.phase), lane = d.shapes.find((s) => s.kind === 'lane' && s.label === c.lane);
  if (!ph || !lane) return undefined;
  const x = Math.max(ph.x, lane.x), y = Math.max(ph.y, lane.y);
  return { box: { x, y, w: Math.min(ph.x + ph.w, lane.x + lane.w) - x, h: Math.min(ph.y + ph.h, lane.y + lane.h) - y }, label: `→ ${ph.label} · ${c.lane}` };
}

export function useActivityDrag(svg: RefObject<SVGSVGElement | null>, drawn: Drawing, o: DragOptions) {
  const [ghost, setGhost] = useState<Ghost | null>(null), moved = useRef(false), cur = useRef(drawn), opts = useRef(o);
  cur.current = drawn; opts.current = o;
  const onDrag = useCallback((id: string, e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM?.(), s = cur.current.shapes.find((x) => x.id === id);
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || !m || !s) return;
    const touch = e.pointerType === 'touch', group = opts.current.group(), mine = group.includes(id);
    const sx = e.clientX, sy = e.clientY, listen = (on: boolean): void => {
      for (const [t, f] of [['pointermove', move], ['pointerup', up], ['pointercancel', up]] as const) {
        if (on) window.addEventListener(t, f as EventListener); else window.removeEventListener(t, f as EventListener);
      }
    };
    let g: Ghost | null = null, long = false;
    const timer = touch ? setTimeout(() => { long = true; moved.current = true; setGhost(null); g = null; opts.current.onLong(id, sx, sy); }, LONG_MS) : null;
    const drags = !touch || mine;   // a finger on an activity not selected pans the canvas
    if (drags) e.stopPropagation();
    const inv = m.inverse(), at = (cx: number, cy: number) => new DOMPoint(cx, cy).matrixTransform(inv), p0 = at(sx, sy);
    moved.current = false;
    function move(ev: PointerEvent): void {
      if (long || (!moved.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5)) return;
      if (timer) clearTimeout(timer);
      if (!drags) { listen(false); return; }
      moved.current = true;
      const p = at(ev.clientX, ev.clientY), b = { x: s!.x + p.x - p0.x, y: s!.y + p.y - p0.y, w: s!.w, h: s!.h };
      g = { ...b, id, n: mine && group.length > 1 ? group.length : 1, target: targetOf(cur.current, b) };
      setGhost(g);
    }
    function up(): void {
      listen(false);
      if (timer) clearTimeout(timer);
      setGhost(null);
      setTimeout(() => { moved.current = false; }, 0);   // the click that ends the gesture (if any) comes first
      const c = g && !long ? cellAt(cur.current, g.x + g.w / 2, g.y + g.h / 2) : null;
      if (!c) return;
      opts.current.onEdited?.(id);
      const ids = mine && group.length > 1 ? group : [id], subOf = (x: string) => cur.current.shapes.find((sh) => sh.id === x)?.sub;
      if (c.sub) {   // dropped on a sub-process: they join it
        const rest = ids.filter((x) => subOf(x) !== c.sub);
        if (rest.length) toast(addToProcessSub(c.sub, ...rest) ?? `${rest.join(', ')} put in ${c.sub} (Ctrl+Z undoes)`);
        return;
      }
      if (ids.length > 1) placeProcessActivities(ids, c.phase, c.lane); else placeProcessActivity(id, c.phase, c.lane);
    }
    listen(true);
  }, [svg]);
  return { ghost, onDrag, moved };
}
