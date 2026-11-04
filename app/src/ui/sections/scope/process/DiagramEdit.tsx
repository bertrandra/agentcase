import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { removeProcessActivity } from '@/controllers/process';
import { placeProcessActivity } from '@/controllers/processLayout';
import { addToProcessSub, createProcessSub, deleteProcessSub } from '@/controllers/processSubs';
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

/** The cell of the drawing under a point: the smallest phase box and the lane that hold it, and the sub-process box there, if any. */
export function cellAt(d: Drawing, x: number, y: number): { phase: string; lane: string; sub?: string } | null {
  const holds = (s: { x: number; y: number; w: number; h: number }) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  const phase = d.shapes.filter((s) => s.kind === 'phase' && holds(s)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  const lane = d.shapes.find((s) => s.kind === 'lane' && holds(s));
  const sub = d.shapes.find((s) => s.kind === 'sub' && holds(s));
  if (sub) return { phase: sub.phase ?? phase?.id ?? '', lane: lane?.label ?? '', sub: sub.id };   // a drop on a sub-process needs no cell
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
export function useActivityDrag(svg: RefObject<SVGSVGElement | null>, drawn: Drawing, onEdited?: (id: string) => void) {
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
      if (!c) return;
      onEdited?.(id);
      const mine = cur.current.shapes.find((s) => s.id === id)?.sub;   // dropped on a sub-process: it joins it; out of its own: it leaves it
      if (c.sub) { if (c.sub !== mine) toast(addToProcessSub(c.sub, id) ?? `${id} put in ${c.sub} (Ctrl+Z undoes)`); return; }
      placeProcessActivity(id, c.phase, c.lane);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [svg, onEdited]);
  return { ghost, onDrag, moved };
}

export interface MenuAt { id: string; x: number; y: number }
interface Item { label: string; run: () => void }
/** A small menu at `at` (in the diagram's box): its items; Escape or a pointer down elsewhere (but on a link's handle) closes it. */
export function PopMenu({ at, label, items, onClose }: { at: MenuAt; label: string; items: Item[]; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current) { box.current.style.left = `${at.x}px`; box.current.style.top = `${at.y}px`; }   // where it was opened
    box.current?.querySelector('button')?.focus();
    const away = (e: PointerEvent): void => {
      const t = e.target as Element;
      if (!box.current?.contains(t) && !t.closest?.('.ac-bpmn-handle')) onClose();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [at, onClose]);
  return (
    <div ref={box} className="ac-proc-menu" role="menu" aria-label={label} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      {items.map((it) => <button key={it.label} type="button" role="menuitem" onClick={() => { it.run(); onClose(); }}>{it.label}</button>)}
    </div>
  );
}

/**
 * The "⋯" menu of an activity: Edit details, Add a link (then click the activity it leads to), Create a sub-process (of the activities picked
 * with Ctrl / Shift + click when it is one of them, else of this one; drop others on it later), Delete activity.
 */
export function ActivityMenu({ at, picked, onEdit, onLink, onClose }: {
  at: MenuAt; picked: string[]; onEdit: (id: string) => void; onLink: (id: string) => void; onClose: () => void;
}) {
  const ids = picked.includes(at.id) ? picked : [at.id];
  const group = (): void => { toast(createProcessSub(ids) ?? `Sub-process of ${ids.join(', ')} created: drop other activities on it (Ctrl+Z undoes)`); };
  const remove = (): void => {
    if (processView.getState().selected === at.id) selectActivity(null);
    removeProcessActivity(at.id);
    toast(`Activity ${at.id} deleted (Ctrl+Z undoes)`);
  };
  return (
    <PopMenu at={at} label={`Actions on activity ${at.id}`} onClose={onClose}
      items={[{ label: '✏️ Edit details', run: () => onEdit(at.id) }, { label: '🔗 Add a link', run: () => onLink(at.id) },
        { label: ids.length > 1 ? `📦 Create a sub-process (${ids.length} activities)` : '📦 Create a sub-process', run: group },
        { label: '🗑️ Delete activity', run: remove }]} />
  );
}

/** The "⋯" menu of a sub-process: Delete sub-process (its activities stay in the phase, its links go back to them). */
export function SubMenu({ at, onClose }: { at: MenuAt; onClose: () => void }) {
  const remove = (): void => { deleteProcessSub(at.id); toast(`Sub-process ${at.id} deleted, its activities kept (Ctrl+Z undoes)`); };
  return <PopMenu at={at} label={`Actions on sub-process ${at.id}`} onClose={onClose} items={[{ label: '🗑️ Delete sub-process', run: remove }]} />;
}
