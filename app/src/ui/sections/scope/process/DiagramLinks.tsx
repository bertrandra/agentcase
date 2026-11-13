import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { addProcessLink, reconnectProcessLink, removeProcessLink } from '@/controllers/processLayout';
import type { Drawing, LinkEnd } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { PopMenu, type MenuAt } from './DiagramEdit';

/**
 * The links on the process diagram's canvas (owner's request 2026-11-04): "🔗 Add a link" in an activity's menu, then a click on the activity it
 * leads to; a click on a link selects it, with a handle at each end (drag one onto another activity to move that end) and a menu (Delete link).
 * Each change is one undoable step; a refused one (another phase, a duplicate, the activity itself) says why. Only plain sequence flows are
 * edited: not rework or message flows, nor the links a view draws over hidden activities.
 */
export const editableEdge = (e: Drawing['edges'][number]): boolean => !!e.source && !!e.target && !e.rework && !e.message && !e.bridged;
type Pt = [number, number];

export function useLinks(svg: RefObject<SVGSVGElement | null>, root: RefObject<HTMLDivElement | null>, drawn: Drawing, onEdited?: (id: string) => void) {
  const [from, setFrom] = useState<string | null>(null), [edge, setEdge] = useState<MenuAt | null>(null);
  const [pull, setPull] = useState<{ fixed: Pt; at: Pt } | null>(null);
  const fromRef = useRef(from), edgeRef = useRef(edge), cur = useRef(drawn);
  fromRef.current = from; edgeRef.current = edge; cur.current = drawn;
  const startLink = useCallback((id: string) => { setEdge(null); setFrom(id); }, []);
  /** A click on an activity while a link is drawn: links it (true: the click is used). */
  const pickTarget = useCallback((id: string): boolean => {
    const f = fromRef.current;
    if (!f) return false;
    setFrom(null);
    onEdited?.(id);
    toast(addProcessLink(f, id) ?? `${f} linked to ${id} (Ctrl+Z undoes)`);
    return true;
  }, [onEdited]);
  const onEdge = useCallback((id: string, cx: number, cy: number) => {
    const r = root.current?.getBoundingClientRect();
    setFrom(null);
    setEdge({ id, x: cx - (r?.left ?? 0), y: cy - (r?.top ?? 0) });
  }, [root]);
  const closeEdge = useCallback(() => setEdge(null), []);
  useEffect(() => {
    if (!from) return undefined;
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') setFrom(null); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [from]);
  const onHandle = useCallback((end: LinkEnd, e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM?.(), ed = cur.current.edges.find((x) => x.id === edgeRef.current?.id);
    if (!m || !ed || ed.points.length < 2) return;
    e.stopPropagation();
    e.preventDefault();
    const inv = m.inverse(), at = (ev: { clientX: number; clientY: number }): Pt => {
      const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(inv);
      return [p.x, p.y];
    };
    const fixed = end === 'source' ? ed.points[ed.points.length - 1]! : ed.points[0]!;
    let last = at(e);
    setPull({ fixed, at: last });
    const move = (ev: PointerEvent): void => { last = at(ev); setPull({ fixed, at: last }); };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setPull(null);
      const [x, y] = last, hit = cur.current.shapes.find((s) => s.kind === 'activity' && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
      if (!hit) return;
      onEdited?.(hit.id);
      toast(reconnectProcessLink(ed.id, end, hit.id) ?? `Link moved to ${hit.id} (Ctrl+Z undoes)`);
      setEdge(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [svg, onEdited]);
  return { from, startLink, pickTarget, onEdge, edge, closeEdge, onHandle, pull };
}

/** The selected link drawn over the shapes: highlighted, a handle at each end, the line pulled by a handle while it is dragged. */
export function EdgeHandles({ d, id, pull, onHandle }: {
  d: Drawing; id: string; pull: { fixed: Pt; at: Pt } | null; onHandle: (end: LinkEnd, e: React.PointerEvent) => void;
}) {
  const e = d.edges.find((x) => x.id === id);
  if (!e || e.points.length < 2) return null;
  const ends: [LinkEnd, Pt][] = [['source', e.points[0]!], ['target', e.points[e.points.length - 1]!]];
  return (
    <g className="ac-bpmn-edge-sel">
      <polyline className="ac-bpmn-edge is-selected" points={e.points.map((p) => p.join(',')).join(' ')} />
      {ends.map(([end, [x, y]]) => (
        <circle key={end} className="ac-bpmn-handle" cx={x} cy={y} r={9} onPointerDown={(ev) => onHandle(end, ev)}>
          <title>{`Drag onto another activity to move the ${end === 'source' ? 'start' : 'end'} of the link`}</title>
        </circle>
      ))}
      {pull && <line className="ac-bpmn-pull" x1={pull.fixed[0]} y1={pull.fixed[1]} x2={pull.at[0]} y2={pull.at[1]} />}
    </g>
  );
}

/** The menu of the selected link: Delete link. */
export function EdgeMenu({ at, onClose }: { at: MenuAt; onClose: () => void }) {
  const remove = (): void => { removeProcessLink(at.id); toast(`Link ${at.id} deleted (Ctrl+Z undoes)`); };
  return <PopMenu at={at} label={`Actions on link ${at.id}`} items={[{ label: '🗑️ Delete link', run: remove }]} onClose={onClose} />;
}
