import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { compactDrawing, hideActivities, type Drawing, type DrawShape } from '@/domain/process';
import { centreOn, FIT, fitTo, viewOf } from './diagramCamera';
import { categoryOf, colourClass, DiagramOptions, type ActFacts, type DiagramColour } from './DiagramOptions';
import { FrozenLanes, Shapes } from './DiagramShapes';
import { FullScreenButton, useFullScreen } from '@/ui/widgets/FullScreen';
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
/**
 * `labelZoom`: the zoom "Zoom to selection" reaches at least, and the label rule when the frame's size is unknown. The labels are drawn as soon as
 * they are readable on screen (owner, 2026-11-03): the drawing's scale in screen pixels per unit at least `READABLE` (12-unit text at 6 px or more),
 * whatever the zoom: a compact or full-screen diagram shows its labels at Fit.
 */
const READABLE = 0.5;
interface Props {
  d: Drawing; tableId: string; title: string; desc: string; name: string; labelZoom?: number;
  facts?: ReadonlyMap<string, ActFacts>; shown?: ReadonlySet<string> | null;
}
export function Diagram({ d, tableId, title, desc, name, labelZoom = 2, facts, shown = null }: Props) {
  const id = useId(), box = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), selected = useProcessView((s) => s.selected);
  const [hideOut, setHideOut] = useState(false), [colour, setColour] = useState<DiagramColour>(''), [picked, setPicked] = useState<string[]>([]);
  // owner, 2026-11-03: hiding the out-of-scope activities closes the space they leave
  const [compact, setCompact] = useState(true), frame = useFrameSize(box);
  const [freeze, setFreeze] = useState(false), root = useRef<HTMLDivElement>(null), full = useFullScreen(root, () => setCam(FIT));
  const out = (s: DrawShape): boolean => (facts?.get(s.id) ? !facts.get(s.id)!.counted : s.inScope === false);
  const drawn = useMemo(() => {
    if (!hideOut) return d;
    const h = hideActivities(d, new Set(d.shapes.filter((s) => s.kind === 'activity' && out(s)).map((s) => s.id)));
    return compact ? compactDrawing(h) : h;
  }, [d, hideOut, compact, facts]);   // eslint-disable-line react-hooks/exhaustive-deps -- `out` reads facts
  const { cam, setCam, zoom, handlers } = useCamera(drawn.box, box, svg), v = viewOf(drawn.box, cam);
  useEffect(() => { setCam(FIT); }, [drawn.box]);   // eslint-disable-line react-hooks/exhaustive-deps -- a new layout is shown whole
  const acts = drawn.shapes.filter((s) => s.kind === 'activity');
  const extra = useMemo(() => new Map(d.shapes.filter((s) => s.kind === 'activity').map((s) => [s.id, [colourClass(colour, facts?.get(s.id)),
    shown && !shown.has(s.id) ? 'is-faded' : '', picked.includes(s.id) && s.id !== selected ? 'is-picked' : ''].filter(Boolean).join(' ')])),
  [d, colour, facts, shown, picked, selected]);
  const used = colour && facts ? [...new Set(acts.map((s) => facts.get(s.id)).map((f) => (f ? categoryOf(colour, f) : '')))] : [];
  const selRef = useRef(selected);
  selRef.current = selected;
  const onPick = useCallback((pid: string, add: boolean) => {   // stable: the memoised shapes do not redraw on a pan
    const cur = selRef.current;
    setPicked((p) => (add ? (p.includes(pid) ? p.filter((x) => x !== pid) : [...p, ...(cur && !p.length ? [cur] : []), pid]) : [pid]));
    selectActivity(pid);
  }, []);
  const sel = drawn.shapes.find((s) => s.id === selected && s.kind === 'activity');
  useEffect(() => {   // a selection from the table: the picked set follows it, and it is brought into view when zoomed in
    if (selected && !picked.includes(selected)) setPicked([selected]);
    if (sel) setCam((c) => (c.s <= 1 ? c : centreOn(drawn.box, { x: sel.x + sel.w / 2, y: sel.y + sel.h / 2 }, c.s)));
  }, [sel, drawn]);   // eslint-disable-line react-hooks/exhaustive-deps -- only a new selection or drawing moves the camera
  const targets = picked.length ? acts.filter((s) => picked.includes(s.id)) : shown ? acts.filter((s) => shown.has(s.id)) : [];
  const fit = fitTo(drawn.box, targets, labelZoom);
  const px = frame.w && frame.h ? Math.min(frame.w / v.w, frame.h / v.h) : 0;
  const readable = px > 0 ? px >= READABLE : cam.s >= labelZoom;
  return (
    <div ref={root} className={`ac-proc-diagram${full.className}`}>
      <div className="ac-form-row" role="toolbar" aria-label={`${name} zoom`}>
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setCam(FIT)}>Fit</button>
        <span className="ac-muted">{Math.round(cam.s * 100)}%</span>
        <FullScreenButton on={full.on} toggle={full.toggle} what={name} />
        <p className="ac-proc-live" aria-live="polite">
          {sel ? `Selected: ${sel.id} ${sel.label}${sel.inScope === false ? ' (out of scope)' : ''}${picked.length > 1 ? ` (+${picked.length - 1} more)` : ''}`
            : 'No activity selected'}
        </p>
      </div>
      <DiagramOptions name={name} hideOut={hideOut} onHideOut={setHideOut} compact={compact} onCompact={setCompact} colour={colour} onColour={setColour}
        used={used.filter(Boolean)}
        freeze={freeze} onFreeze={setFreeze}
        colours={!!facts} zoomLabel={picked.length || !shown ? 'Zoom to selection' : 'Zoom to filtered'} onZoomSel={fit ? () => setCam(fit) : null} />
      <div ref={box} className="ac-proc-canvas" tabIndex={0} role="group" {...handlers}
        aria-label={`${name}: + and − zoom, arrow keys pan, 0 fits, two fingers pinch; the activity table below lists the same elements`}>
        <svg ref={svg} className={readable ? 'is-readable' : 'is-overview'} viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d ${tableId}`}
          preserveAspectRatio="xMidYMid meet">
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{desc}</desc>
          <Shapes d={drawn} selected={selected} onPick={onPick} labels={readable} extra={extra} />
          {freeze && <FrozenLanes d={drawn} v={v} px={{ w: box.current?.clientWidth || 800, h: box.current?.clientHeight || 450 }} />}
        </svg>
      </div>
    </div>
  );
}

/** The frame's size in screen pixels, followed as it changes (full screen, window resize); 0 × 0 where it cannot be measured (tests). */
function useFrameSize(ref: React.RefObject<HTMLDivElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
