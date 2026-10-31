import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Drawing, DrawShape } from '@/domain/process';
import { centreOn, FIT, fitTo, viewOf } from './diagramCamera';
import { colourClass, DiagramOptions, type ActFacts, type DiagramColour } from './DiagramOptions';
import { Shapes } from './DiagramShapes';
import { useCamera } from './useCamera';
import { selectActivity, useProcessView } from './view';

/**
 * The process diagram (spec F-B15, § 8): SVG drawn from the document's BPMN DI, read-only. Zoom and pan with the buttons, the keyboard on the
 * focused frame (+ / − / 0, arrow keys), the pointer (drag, wheel at the cursor) and two fingers (pinch). A click on an activity selects it, like its
 * id in the table; Ctrl / Shift + click adds it to the selection that "Zoom to selection" fits, at a readable zoom at least. The filters of the
 * activity table fade the activities they leave out (`shown`); the display options hide the activities out of scope and colour them by task type
 * or AI authority (`facts`). The live region says which element is selected. The SVG is an image whose text alternative is the activity table
 * below it. It draws the delivery process (from the document's DI) and the transformation programme (its derived layout, phase B9a) alike.
 */
/** `labelZoom`: the zoom from which activity labels are drawn (2: a large process shows its structure first; 1: a small one, always). */
interface Props {
  d: Drawing; tableId: string; title: string; desc: string; name: string; labelZoom?: number;
  facts?: ReadonlyMap<string, ActFacts>; shown?: ReadonlySet<string> | null;
}
export function Diagram({ d, tableId, title, desc, name, labelZoom = 2, facts, shown = null }: Props) {
  const id = useId(), box = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), selected = useProcessView((s) => s.selected);
  const { cam, setCam, zoom, handlers } = useCamera(d.box, box, svg), v = viewOf(d.box, cam);
  const [hideOut, setHideOut] = useState(false), [colour, setColour] = useState<DiagramColour>(''), [picked, setPicked] = useState<string[]>([]);
  const out = (s: DrawShape): boolean => (facts?.get(s.id) ? !facts.get(s.id)!.counted : s.inScope === false);
  const acts = d.shapes.filter((s) => s.kind === 'activity' && !(hideOut && out(s)));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `out` reads facts
  const drawn = useMemo(() => (hideOut ? { ...d, shapes: d.shapes.filter((s) => s.kind !== 'activity' || !out(s)) } : d), [d, hideOut, facts]);
  const extra = useMemo(() => new Map(d.shapes.filter((s) => s.kind === 'activity').map((s) => [s.id, [colourClass(colour, facts?.get(s.id)),
    shown && !shown.has(s.id) ? 'is-faded' : '', picked.includes(s.id) && s.id !== selected ? 'is-picked' : ''].filter(Boolean).join(' ')])),
  [d, colour, facts, shown, picked, selected]);
  const used = colour && facts ? [...new Set(acts.map((s) => facts.get(s.id)).map((f) => (f ? (colour === 'type' ? f.type : f.authority) : '')))] : [];
  const selRef = useRef(selected);
  selRef.current = selected;
  const onPick = useCallback((pid: string, add: boolean) => {   // stable: the memoised shapes do not redraw on a pan
    const cur = selRef.current;
    setPicked((p) => (add ? (p.includes(pid) ? p.filter((x) => x !== pid) : [...p, ...(cur && !p.length ? [cur] : []), pid]) : [pid]));
    selectActivity(pid);
  }, []);
  const sel = d.shapes.find((s) => s.id === selected && s.kind === 'activity');
  useEffect(() => {   // a selection from the table: the picked set follows it, and it is brought into view when zoomed in
    if (selected && !picked.includes(selected)) setPicked([selected]);
    if (sel) setCam((c) => (c.s <= 1 ? c : centreOn(d.box, { x: sel.x + sel.w / 2, y: sel.y + sel.h / 2 }, c.s)));
  }, [sel, d]);   // eslint-disable-line react-hooks/exhaustive-deps -- only a new selection or drawing moves the camera
  const targets = picked.length ? acts.filter((s) => picked.includes(s.id)) : shown ? acts.filter((s) => shown.has(s.id)) : [];
  const fit = fitTo(d.box, targets, labelZoom);
  return (
    <div className="ac-proc-diagram">
      <div className="ac-form-row" role="toolbar" aria-label={`${name} zoom`}>
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setCam(FIT)}>Fit</button>
        <span className="ac-muted">{Math.round(cam.s * 100)}%</span>
        <p className="ac-proc-live" aria-live="polite">
          {sel ? `Selected: ${sel.id} ${sel.label}${sel.inScope === false ? ' (out of scope)' : ''}${picked.length > 1 ? ` (+${picked.length - 1} more)` : ''}`
            : 'No activity selected'}
        </p>
      </div>
      <DiagramOptions name={name} hideOut={hideOut} onHideOut={setHideOut} colour={colour} onColour={setColour} used={used.filter(Boolean)}
        colours={!!facts} zoomLabel={picked.length || !shown ? 'Zoom to selection' : 'Zoom to filtered'} onZoomSel={fit ? () => setCam(fit) : null} />
      <div ref={box} className="ac-proc-canvas" tabIndex={0} role="group" {...handlers}
        aria-label={`${name}: + and − zoom, arrow keys pan, 0 fits, two fingers pinch; the activity table below lists the same elements`}>
        <svg ref={svg} viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d ${tableId}`}
          preserveAspectRatio="xMidYMid meet">
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{desc}</desc>
          <Shapes d={drawn} selected={selected} onPick={onPick} labels={cam.s >= labelZoom} extra={extra} />
        </svg>
      </div>
    </div>
  );
}
