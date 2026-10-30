import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { drawingOf, type XDocument } from '@/domain/process';
import { Shapes } from './DiagramShapes';
import { selectActivity, useProcessView } from './view';

/**
 * The process diagram (spec F-B15, § 8): SVG drawn from the document's BPMN DI, read-only. Zoom and pan with the buttons, the keyboard on the
 * focused frame (+ / − / 0, arrow keys) and the pointer (drag, wheel). A click on an activity selects it, like its id in the table; the live
 * region says which element is selected. The SVG is an image whose text alternative is the activity table below it.
 */
interface Cam { s: number; x: number; y: number }
const FIT: Cam = { s: 1, x: 0, y: 0 };
const clampS = (s: number): number => Math.min(40, Math.max(1, s));

export function Diagram({ doc, tableId }: { doc: XDocument; tableId: string }) {
  const d = drawingOf(doc), id = useId(), box = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; cam: Cam } | null>(null);
  const [cam, setCam] = useState<Cam>(FIT), selected = useProcessView((s) => s.selected);
  const w = d.box.w / cam.s, h = d.box.h / cam.s, vx = d.box.x + cam.x, vy = d.box.y + cam.y;
  const zoom = (f: number) => setCam((c) => {
    const s = clampS(c.s * f), cx = c.x + d.box.w / c.s / 2, cy = c.y + d.box.h / c.s / 2;
    return { s, x: cx - d.box.w / s / 2, y: cy - d.box.h / s / 2 };
  });
  const pan = (dx: number, dy: number) => setCam((c) => ({ ...c, x: c.x + (dx * d.box.w) / c.s, y: c.y + (dy * d.box.h) / c.s }));
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
  const onKey = (e: KeyboardEvent) => {
    const k: Record<string, () => void> = { '+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(0.8), '0': () => setCam(FIT),
      ArrowLeft: () => pan(-0.1, 0), ArrowRight: () => pan(0.1, 0), ArrowUp: () => pan(0, -0.1), ArrowDown: () => pan(0, 0.1) };
    const f = k[e.key];
    if (f) { e.preventDefault(); f(); }
  };
  const onDown = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, cam }; };
  const onMove = (e: PointerEvent) => {
    const g = drag.current, el = box.current;
    if (!g || !el || !(e.buttons & 1)) return;
    const k = w / Math.max(1, el.clientWidth);
    setCam({ ...g.cam, x: g.cam.x - (e.clientX - g.x) * k, y: g.cam.y - (e.clientY - g.y) * k });
  };
  const sel = d.shapes.find((s) => s.id === selected && s.kind === 'activity');
  useEffect(() => {   // a selection (from the table) is brought into view when zoomed in
    if (sel) setCam((c) => (c.s <= 1 ? c : { ...c, x: sel.x + sel.w / 2 - d.box.x - d.box.w / c.s / 2, y: sel.y + sel.h / 2 - d.box.y - d.box.h / c.s / 2 }));
  }, [sel, d]);
  const acts = d.shapes.filter((s) => s.kind === 'activity').length, phases = d.shapes.filter((s) => s.kind === 'phase').length;
  return (
    <div className="ac-proc-diagram">
      <div className="ac-form-row" role="toolbar" aria-label="Diagram zoom">
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setCam(FIT)}>Fit</button>
        <span className="ac-muted">{Math.round(cam.s * 100)}%</span>
        <p className="ac-proc-live" aria-live="polite">
          {sel ? `Selected: ${sel.id} ${sel.label}${sel.inScope === false ? ' (out of scope)' : ''}` : 'No activity selected'}
        </p>
      </div>
      <div ref={box} className="ac-proc-canvas" tabIndex={0} role="group" onKeyDown={onKey} onPointerDown={onDown} onPointerMove={onMove}
        onPointerUp={() => { drag.current = null; }}
        aria-label="Process diagram: + and − zoom, arrow keys pan, 0 fits; the activity table below lists the same elements">
        <svg viewBox={`${vx} ${vy} ${w} ${h}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d ${tableId}`}
          preserveAspectRatio="xMidYMid meet">
          <title id={`${id}-t`}>Diagram of the delivery process</title>
          <desc id={`${id}-d`}>{`${acts} activities in ${phases} phases, drawn from the BPMN diagram of the case.`}</desc>
          <Shapes d={d} selected={selected} onPick={selectActivity} labels={cam.s >= 2} />
        </svg>
      </div>
    </div>
  );
}
