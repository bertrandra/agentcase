import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { removeProcessActivity } from '@/controllers/process';
import { placeProcessActivity } from '@/controllers/processLayout';
import type { Drawing } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { processView, selectActivity } from './view';

/**
 * Editing on the process diagram's canvas (owner's request 2026-11-04): drag an activity to another cell (phase × lane: its phase and the lane's
 * role, one undoable step), the "⋯" menu at the bottom right of an activity (edit its details in the activity panel, delete it), and "+ Add
 * activity". Every change goes through the process commands; the keyboard equivalents are the activity table and panel (phase, role, Remove).
 */
export interface Ghost { id: string; x: number; y: number; w: number; h: number }
const ACTIVITY_PANEL = 'ac-proc-activity';

/** The cell of the drawing under a point: the smallest phase box and the lane that hold it. */
export function cellAt(d: Drawing, x: number, y: number): { phase: string; lane: string } | null {
  const holds = (s: { x: number; y: number; w: number; h: number }) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  const phase = d.shapes.filter((s) => s.kind === 'phase' && holds(s)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  const lane = d.shapes.find((s) => s.kind === 'lane' && holds(s));
  return phase && lane ? { phase: phase.id, lane: lane.label } : null;
}

/** Shows the activity panel of `id` (the "edit box"): selected, scrolled into view, its name field focused. */
export function openActivityPanel(id: string): void {
  selectActivity(id);
  setTimeout(() => {
    const el = document.getElementById(ACTIVITY_PANEL);
    el?.scrollIntoView?.({ block: 'nearest' });
    el?.querySelector('input')?.focus();
  }, 0);
}
export const activityPanelId = ACTIVITY_PANEL;

/**
 * Dragging an activity: `onDrag` (stable) starts on a pointer down on the activity; past 5 px a ghost follows the pointer, and the drop places the
 * activity in the cell under the ghost's centre. `moved` tells the click that ends a drag not to select.
 */
export function useActivityDrag(svg: RefObject<SVGSVGElement | null>, drawn: Drawing) {
  const [ghost, setGhost] = useState<Ghost | null>(null), moved = useRef(false), cur = useRef(drawn);
  cur.current = drawn;
  const onDrag = useCallback((id: string, e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM?.(), s = cur.current.shapes.find((x) => x.id === id);
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || !m || !s) return;
    e.stopPropagation();   // the canvas does not pan
    const inv = m.inverse(), at = (cx: number, cy: number) => new DOMPoint(cx, cy).matrixTransform(inv), p0 = at(e.clientX, e.clientY);
    const sx = e.clientX, sy = e.clientY;
    let g: Ghost | null = null;
    moved.current = false;
    const move = (ev: PointerEvent): void => {
      if (!moved.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      moved.current = true;
      const p = at(ev.clientX, ev.clientY);
      g = { id, x: s.x + p.x - p0.x, y: s.y + p.y - p0.y, w: s.w, h: s.h };
      setGhost(g);
    };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setGhost(null);
      setTimeout(() => { moved.current = false; }, 0);   // the click that ends the drag (if any) comes first
      const c = g && cellAt(cur.current, g.x + g.w / 2, g.y + g.h / 2);
      if (c) placeProcessActivity(id, c.phase, c.lane);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [svg]);
  return { ghost, onDrag, moved };
}

export interface MenuAt { id: string; x: number; y: number }
/** The "⋯" menu of an activity, at the click (in the diagram's box): Edit details, Delete activity. Escape or a click elsewhere closes it. */
export function ActivityMenu({ at, onEdit, onClose }: { at: MenuAt | null; onEdit: (id: string) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return undefined;
    if (box.current) { box.current.style.left = `${at.x}px`; box.current.style.top = `${at.y}px`; }   // where the ⋯ was clicked
    box.current?.querySelector('button')?.focus();
    const away = (e: PointerEvent): void => { if (!box.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [at, onClose]);
  if (!at) return null;
  const remove = (): void => {
    if (processView.getState().selected === at.id) selectActivity(null);
    removeProcessActivity(at.id);
    toast(`Activity ${at.id} deleted (Ctrl+Z undoes)`);
    onClose();
  };
  return (
    <div ref={box} className="ac-proc-menu" role="menu" aria-label={`Actions on activity ${at.id}`}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <button type="button" role="menuitem" onClick={() => { onEdit(at.id); onClose(); }}>✏️ Edit details</button>
      <button type="button" role="menuitem" onClick={remove}>🗑️ Delete activity</button>
    </div>
  );
}
