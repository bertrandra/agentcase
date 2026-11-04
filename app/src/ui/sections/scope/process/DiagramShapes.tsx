import { memo, useId } from 'react';
import type { Drawing, DrawShape } from '@/domain/process';
import { shallowEqual } from '@/store/equal';
import { editableEdge } from './DiagramLinks';

/** The label of a shape cut into lines of about `n` characters (at most `max` lines, the last one ellipsed). */
export function lines(label: string, n: number, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of label.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.length > max ? [...out.slice(0, max - 1), `${(out[max - 1] ?? '').slice(0, n - 1)}…`] : out;
}

const cls = (s: DrawShape, selected: string | null, extra: string): string =>
  ['ac-bpmn', `ac-bpmn-${s.kind}`, s.inScope === false ? 'is-out' : '', s.regulatory ? 'is-reg' : '', s.placed ? 'is-placed' : '',
    s.id === selected ? 'is-selected' : '', extra].filter(Boolean).join(' ');

/** `onPick(id, add)`: a click on an activity, `add` with Ctrl, Cmd or Shift (adds it to the diagram's selection). */
/** `onDrag`, `onMenu`: an editable diagram (a pointer down on an activity starts a drag; its ⋯ at the bottom right opens its menu at the click). */
interface Props {
  selected: string | null; onPick: (id: string, add: boolean) => void; labels: boolean;
  onDrag?: (id: string, e: React.PointerEvent) => void; onMenu?: (id: string, x: number, y: number) => void;
}
function ShapeView({ s, selected, onPick, labels, x, onDrag, onMenu }: Props & { s: DrawShape; x: string }) {
  const c = cls(s, selected, x);
  if (s.kind === 'event') return <circle className={c} cx={s.x + s.w / 2} cy={s.y + s.h / 2} r={s.w / 2} />;
  if (s.kind === 'gateway') {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    return <polygon className={c} points={`${cx},${s.y} ${s.x + s.w},${cy} ${cx},${s.y + s.h} ${s.x},${cy}`} />;
  }
  if (s.kind === 'activity') {
    return (
      <g className={c} onClick={(e) => onPick(s.id, e.ctrlKey || e.metaKey || e.shiftKey)} onPointerDown={onDrag && ((e) => onDrag(s.id, e))}>
        <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={8} />
        {labels && <text x={s.x + s.w / 2} y={s.y + 16} textAnchor="middle">
          <tspan x={s.x + s.w / 2} className="ac-bpmn-id">{s.id}</tspan>
          {lines(s.label, 16, 3).map((l, i) => <tspan key={i} x={s.x + s.w / 2} dy={14}>{l}</tspan>)}
        </text>}
        {s.marker && <text className="ac-bpmn-marker" x={s.x + s.w / 2} y={s.y + s.h - 6} textAnchor="middle">{s.marker}</text>}
        {onMenu && <More s={s} onMenu={onMenu} what="edit, link, group, delete" />}
      </g>
    );
  }
  const vertical = s.kind === 'pool' || s.kind === 'lane';
  return (
    <g className={c}>
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.kind === 'phase' || s.kind === 'sub' ? 10 : 0} />
      {s.label && (vertical
        ? <text x={s.x + 18} y={s.y + s.h / 2} textAnchor="middle" transform={`rotate(-90 ${s.x + 18} ${s.y + s.h / 2})`}>{s.label}</text>
        : <text x={s.x + 10} y={s.kind === 'sub' ? s.y + s.h - 10 : s.y + 20}>{s.label}</text>)}
      {s.marker && <text className="ac-bpmn-marker" x={s.x + 10} y={s.y + 38}>{s.marker}</text>}
      {onMenu && s.kind === 'sub' && <More s={s} onMenu={onMenu} what="delete the sub-process" />}
    </g>
  );
}

/** The ⋯ at the bottom right of an activity or a sub-process: opens its menu at the click. */
function More({ s, onMenu, what }: { s: DrawShape; onMenu: (id: string, x: number, y: number) => void; what: string }) {
  return (
    <g className="ac-bpmn-more" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onMenu(s.id, e.clientX, e.clientY); }}>
      <title>{`Actions on ${s.id}: ${what}`}</title>
      <circle cx={s.x + s.w - 11} cy={s.y + s.h - 11} r={9} />
      <text x={s.x + s.w - 11} y={s.y + s.h - 7} textAnchor="middle">⋯</text>
    </g>
  );
}

type ShapeProps = Props & { s: DrawShape; x: string };
/** Same drawn shape: equal fields (a recomputed drawing gives fresh objects), the same selection state and display classes of THIS shape, labels
 *  and pick handler. */
const sameShape = (a: ShapeProps, b: ShapeProps): boolean => a.labels === b.labels && a.onPick === b.onPick && a.x === b.x
  && a.onDrag === b.onDrag && a.onMenu === b.onMenu
  && shallowEqual(a.s, b.s)
  && (a.selected === a.s.id) === (b.selected === b.s.id);
/** One shape, memoised per node: an edit of one activity redraws that shape only, a selection the two shapes it changes. */
const Shape = memo(ShapeView, sameShape);

/**
 * Every shape and edge of the drawing (memoised: pan changes only the SVG's view box). Activity labels are drawn from 200 % zoom on, where they can be
 * read: the fitted view of a 400-activity process shows its structure, and the table lists the names.
 */
/** `extra`: display classes per activity id (colour, faded by the filters, picked). */
/** `onEdge`: a click on an editable link (selects it, its menu at the click). */
type ShapesProps = Props & { d: Drawing; extra?: ReadonlyMap<string, string>; onEdge?: (id: string, x: number, y: number) => void };
const kindOf = (e: Drawing['edges'][number]): string => (e.rework ? 'rework' : e.message ? 'message' : 'flow');
export const Shapes = memo(function Shapes({ d, selected, onPick, labels, extra, onDrag, onMenu, onEdge }: ShapesProps) {
  const id = useId().replace(/:/g, '');   // one set of arrowheads per diagram (two diagrams share the page)
  return (
    <>
      {/* arrowheads at the end of each link (owner, 2026-11-04), coloured like their link */}
      <defs>{['flow', 'rework', 'message'].map((k) => (
        <marker key={k} id={`${id}-${k}`} className={`ac-bpmn-arrow is-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12"
          markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker>
      ))}</defs>
      {d.shapes.filter((s) => s.kind !== 'activity')
        .map((s) => <Shape key={`${s.kind}:${s.id}`} s={s} selected={selected} onPick={onPick} labels={labels} x=""
          onMenu={s.kind === 'sub' ? onMenu : undefined} />)}
      {d.edges.map((e) => (
        <polyline key={e.id} className={`ac-bpmn-edge${e.rework ? ' is-rework' : ''}${e.message ? ' is-message' : ''}${e.bridged ? ' is-bridged' : ''}`}
          points={e.points.map((p) => p.join(',')).join(' ')} markerEnd={`url(#${id}-${kindOf(e)})`} />
      ))}
      {onEdge && d.edges.filter(editableEdge).map((e) => (   // a wide invisible stroke: the link is easy to click
        <polyline key={`hit:${e.id}`} className="ac-bpmn-edge-hit" points={e.points.map((p) => p.join(',')).join(' ')}
          onClick={(ev) => onEdge(e.id, ev.clientX, ev.clientY)}><title>{`Link ${e.source} → ${e.target}: click to edit`}</title></polyline>
      ))}
      {d.shapes.filter((s) => s.kind === 'activity')
        .map((s) => <Shape key={s.id} s={s} selected={selected} onPick={onPick} labels={labels} x={extra?.get(s.id) ?? ''} onDrag={onDrag} onMenu={onMenu} />)}
    </>
  );
});
