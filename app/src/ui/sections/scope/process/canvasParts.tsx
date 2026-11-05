import type { Drawing, DrawShape } from '@/domain/process';
import { toast } from '@/ui/uiState';
import type { Ghost } from './useActivityDrag';

/**
 * Parts drawn over the process canvas (owner's requests 2026-11-05), written as plain functions (no component of their own, so an edit redraws
 * nothing more): the dragged activity with the cell it will land in and what the drop does, the box of a box selection, a ⋯ of a constant size on
 * screen on the selected activity (a finger-sized target whatever the zoom), and the minimap. `unit`: drawing units per screen pixel.
 */
type Box = { x: number; y: number; w: number; h: number };

export function dragParts(g: Ghost | null, unit: number) {
  if (!g) return null;
  const fs = 13 * unit;
  return (
    <g pointerEvents="none">
      {g.target && <rect className="ac-bpmn-target" x={g.target.box.x} y={g.target.box.y} width={g.target.box.w} height={g.target.box.h} rx={10} />}
      <rect className="ac-bpmn-ghost" x={g.x} y={g.y} width={g.w} height={g.h} rx={8} />
      <text className="ac-bpmn-droplabel" x={g.x} y={g.y - 6 * unit} fontSize={fs}>
        {`${g.n > 1 ? `${g.n} activities ` : ''}${g.target?.label ?? '(no cell here)'}`}
      </text>
    </g>
  );
}

export const bandPart = (b: Box | null) => (b ? <rect className="ac-bpmn-band" x={b.x} y={b.y} width={b.w} height={b.h} pointerEvents="none" /> : null);

/** The selected activity's ⋯ at 18 screen pixels whatever the zoom (the ⋯ drawn in each activity is small at a low zoom). */
export function selectedMore(s: DrawShape | undefined, unit: number, onMenu: (id: string, x: number, y: number) => void) {
  if (!s) return null;
  const r = 18 * unit, cx = s.x + s.w, cy = s.y + s.h;
  return (
    <g className="ac-bpmn-selmore" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onMenu(s.id, e.clientX, e.clientY); }}>
      <title>{`Actions on ${s.id} (the selected activity)`}</title>
      <circle cx={cx} cy={cy} r={r} />
      <text x={cx} y={cy + r * 0.35} fontSize={r * 1.2} textAnchor="middle">⋯</text>
    </g>
  );
}

/**
 * The minimap: the whole drawing small in a corner (phases, lanes, activities as plain boxes, the selection marked) with the window on screen as a
 * frame; a click or tap centres the view there at the same zoom.
 */
export function minimap(d: Drawing, v: Box, selected: string | null, onJump: (p: { x: number; y: number }) => void) {
  const b = d.box;
  return (
    <svg className="ac-proc-minimap" viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        const m = e.currentTarget.getScreenCTM?.();
        if (m) { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); onJump({ x: p.x, y: p.y }); }
      }}>
      {d.shapes.filter((s) => s.kind === 'phase' || s.kind === 'lane' || s.kind === 'activity' || s.kind === 'sub').map((s) => (
        <rect key={`${s.kind}:${s.id}`} className={`is-${s.kind}${s.id === selected ? ' is-selected' : ''}`} x={s.x} y={s.y} width={s.w} height={s.h} />
      ))}
      <rect className="is-window" x={v.x} y={v.y} width={v.w} height={v.h} />
    </svg>
  );
}

/** Find (owner, 2026-11-05): the activity shown whose id is `q`, else whose name holds it; or why there is none. */
export function findActivity(drawn: Drawing, all: Drawing, q: string): { id?: string; msg: string | null } {
  const t = q.trim().toLowerCase(), hit = (s: DrawShape) => s.kind === 'activity' && (s.id.toLowerCase() === t || s.label.toLowerCase().includes(t));
  if (!t) return { msg: null };
  const acts = drawn.shapes.filter((s) => s.kind === 'activity'), s = acts.find((x) => x.id.toLowerCase() === t) ?? acts.find(hit);
  if (s) return { id: s.id, msg: null };
  return { msg: all.shapes.some(hit) ? `"${q}" is not shown (another phase, hidden or collapsed)` : `No activity matches "${q}"` };
}

/** An undo / redo button's action: the step, and a toast saying which one (or that there was none). */
export const historyStep = (f: () => string | null, done: string, none: string) => (): void => {
  const label = f();
  toast(label ? `${done}: ${label}` : none);
};
