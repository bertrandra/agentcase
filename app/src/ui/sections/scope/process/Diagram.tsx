import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { redo, undo } from '@/controllers/history';
import { tidyProcessLayout } from '@/controllers/processCanvas';
import { addCanvasActivity } from '@/controllers/processLayout';
import { collapseSubs, compactDrawing, drawingView, fitSubs, hideActivities, onlyPhase, type Drawing, type DrawShape } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { FullScreenButton, useFullScreen } from '@/ui/widgets/FullScreen';
import { bandPart, dragParts, findActivity, historyStep, minimap, selectedMore } from './canvasParts';
import { bringIntoView, centreOn, FIT, fitTo, viewOf } from './diagramCamera';
import { ActivityMenu, openActivityPanel, SubMenu, type MenuAt } from './DiagramEdit';
import { FrozenLanes, FrozenPhases } from './DiagramFrozen';
import { EdgeHandles, EdgeMenu, useLinks } from './DiagramLinks';
import { categoryOf, colourClass, DiagramOptions, type ActFacts } from './DiagramOptions';
import { Shapes } from './DiagramShapes';
import { exportDiagram } from './exportDiagram';
import { useActivityDrag } from './useActivityDrag';
import { useBoxSelect } from './useBoxSelect';
import { useCamera } from './useCamera';
import { useCanvasKeys } from './useCanvasKeys';
import { useDiagramView } from './useDiagramView';
import { useFrameSize } from './useFrameSize';
import { useKeepView } from './useKeepView';
import { selectActivity, useProcessView } from './view';

/**
 * The process diagram (spec F-B15, § 8): SVG drawn from the document's BPMN DI, read-only. Zoom and pan with the buttons, the keyboard on the
 * focused frame (+ / − / 0, arrow keys), the pointer (drag, wheel at the cursor) and two fingers (pinch). A click on an activity selects it, like its
 * id in the table; Ctrl / Shift + click adds it to the selection that "Zoom to selection" fits, at a readable zoom at least. The filters of the
 * activity table fade the activities they leave out (`shown`); the display options hide the activities out of scope and colour them by task type
 * or AI authority (`facts`). The live region says which element is selected. The SVG is an image whose text alternative is the activity table
 * below it. It draws the delivery process (from the document's DI) and the transformation programme (its derived layout, phase B9a) alike.
 */
/** `labelZoom`: the zoom "Zoom to selection" reaches at least; the labels are drawn as soon as readable on screen (owner, 2026-11-03). */
const READABLE = 0.5, IDS = 0.18;   // below READABLE, the ids alone in large type down to IDS (owner, 2026-11-05)
interface Props {
  d: Drawing; tableId: string; title: string; desc: string; name: string; labelZoom?: number;
  facts?: ReadonlyMap<string, ActFacts>; shown?: ReadonlySet<string> | null;
  /** activity id → its role's lane: offers the points of view (with automation, process only; owner, 2026-11-04) */
  roleLanes?: ReadonlyMap<string, string>;
  /** the canvas edits (owner, 2026-11-04): drag across lanes and phases, the ⋯ menu of an activity, + Add activity */
  editable?: boolean;
}
export function Diagram({ d: doc, tableId, title, desc, name, labelZoom = 2, facts, shown = null, roleLanes, editable = false }: Props) {
  const id = useId(), box = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), root = useRef<HTMLDivElement>(null);
  const selected = useProcessView((s) => s.selected), [o, set] = useDiagramView(name), frame = useFrameSize(box);   // the options, kept per browser
  const [picked, setPicked] = useState<string[]>([]), [multi, setMulti] = useState(false), [menu, setMenu] = useState<MenuAt | null>(null);
  const phases = useMemo(() => doc.shapes.filter((s) => s.kind === 'phase').map((s) => ({ id: s.id, label: s.label })), [doc]);
  const d = useMemo(() => onlyPhase(roleLanes ? drawingView(doc, o.pov, roleLanes) : doc, o.phase), [doc, o.pov, roleLanes, o.phase]);
  const full = useFullScreen(root, () => setCam(FIT)), collapsed = useMemo(() => new Set(o.collapsed), [o.collapsed]);
  const out = (s: DrawShape): boolean => (facts?.get(s.id) ? !facts.get(s.id)!.counted : s.inScope === false);
  const drawn = useMemo(() => {   // hidden, compact, the sub-processes fitted around what is shown, the collapsed ones as one box
    const h = o.hideOut ? hideActivities(d, new Set(d.shapes.filter((s) => s.kind === 'activity' && out(s)).map((s) => s.id))) : d;
    return collapseSubs(fitSubs(o.hideOut && o.compact ? compactDrawing(h) : h), collapsed);
  }, [d, o.hideOut, o.compact, facts, collapsed]);   // eslint-disable-line react-hooks/exhaustive-deps -- `out` reads facts
  const { cam, setCam, zoom, handlers } = useCamera(drawn.box, box, svg), v = viewOf(drawn.box, cam);
  const onEdited = useKeepView(drawn, `${o.pov}|${o.phase}|${o.hideOut}|${o.compact}`, setCam);
  const acts = drawn.shapes.filter((s) => s.kind === 'activity');
  const extra = useMemo(() => new Map(d.shapes.filter((s) => s.kind === 'activity').map((s) => [s.id, [colourClass(o.colour, facts?.get(s.id)),
    shown && !shown.has(s.id) ? 'is-faded' : '', picked.includes(s.id) && s.id !== selected ? 'is-picked' : ''].filter(Boolean).join(' ')])),
  [d, o.colour, facts, shown, picked, selected]);
  const used = o.colour && facts ? [...new Set(acts.map((s) => facts.get(s.id)).map((f) => (f && o.colour ? categoryOf(o.colour, f) : '')))] : [];
  // owner, 2026-11-05: a touch screen has no Ctrl: "Select several" makes each tap add or remove an activity, and a drag on the background a box
  const ref = useRef({ multi, picked, selected });
  ref.current = { multi, picked, selected };
  const onMenu = useCallback((mid: string, cx: number, cy: number) => {
    const r = root.current?.getBoundingClientRect();
    setMenu({ id: mid, x: cx - (r?.left ?? 0), y: cy - (r?.top ?? 0) });
  }, []);
  const drag = useActivityDrag(svg, drawn, { onEdited, group: () => ref.current.picked, onLong: onMenu }), links = useLinks(svg, root, drawn, onEdited);
  const onPick = useCallback((pid: string, add: boolean) => {   // stable: the memoised shapes do not redraw on a pan
    const cur = ref.current.selected;
    if (drag.moved.current) { drag.moved.current = false; return; }   // the click that ends a drag or a long press
    if (links.pickTarget(pid)) return;   // the activity a new link leads to
    if (ref.current.multi) add = true;
    setPicked((p) => (add ? (p.includes(pid) ? p.filter((x) => x !== pid) : [...p, ...(cur && !p.length ? [cur] : []), pid]) : [pid]));
    selectActivity(pid);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- `drag.moved` is a ref, `links.pickTarget` is stable
  const pickOne = (pid: string): void => {   // the keyboard and Find: select it and bring it into view at a readable zoom
    setPicked([pid]);
    selectActivity(pid);
    const s = drawn.shapes.find((x) => x.id === pid), f = s && fitTo(drawn.box, [s], labelZoom);
    if (f) setCam((c) => (c.s >= f.s ? bringIntoView(drawn.box, c, s) : f));
  };
  const band = useBoxSelect(svg, drawn, editable && multi, (ids) => setPicked((p) => [...new Set([...p, ...ids])]));
  const onKeyDown = useCanvasKeys(svg, drawn, selected, { pick: pickOne, menu: onMenu, next: handlers.onKeyDown });
  const closeMenu = useCallback(() => setMenu(null), []), fullRef = useRef(full);
  fullRef.current = full;
  const edit = useCallback((eid: string | null): void => { if (!eid) return; if (fullRef.current.on) fullRef.current.toggle(); openActivityPanel(eid); }, []);
  const sel = drawn.shapes.find((s) => s.id === selected && s.kind === 'activity');
  useEffect(() => {   // a selection from the table: the picked set follows it, and it is brought into view when zoomed in
    if (selected && !picked.includes(selected)) setPicked([selected]);
    if (sel) setCam((c) => (c.s <= 1 ? c : centreOn(drawn.box, { x: sel.x + sel.w / 2, y: sel.y + sel.h / 2 }, c.s)));
  }, [sel, drawn]);   // eslint-disable-line react-hooks/exhaustive-deps -- only a new selection or drawing moves the camera
  const targets = picked.length ? acts.filter((s) => picked.includes(s.id)) : shown ? acts.filter((s) => shown.has(s.id)) : [];
  const fit = fitTo(drawn.box, targets, labelZoom), px = frame.w && frame.h ? Math.min(frame.w / v.w, frame.h / v.h) : 0, unit = px ? 1 / px : 1;
  const labels = px > 0 ? (px >= READABLE ? true : px >= IDS ? 'id' : false) : cam.s >= labelZoom, readable = labels === true;
  const onFind = (q: string): string | null => { const r = findActivity(drawn, doc, q); if (r.id) pickOne(r.id); return r.msg; };
  const px2 = { w: box.current?.clientWidth || 800, h: box.current?.clientHeight || 450 };
  return (
    <div ref={root} className={`ac-proc-diagram${full.className}`}>
      <div className="ac-form-row" role="toolbar" aria-label={`${name} zoom`}>
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setCam(FIT)}>Fit</button>
        <span className="ac-muted">{Math.round(cam.s * 100)}%</span>
        <FullScreenButton on={full.on} toggle={full.toggle} what={name} />
        {editable && <>
          <button type="button" onClick={historyStep(undo, 'Undone', 'Nothing to undo')}>↶ Undo</button>
          <button type="button" onClick={historyStep(redo, 'Redone', 'Nothing to redo')}>↷ Redo</button>
          <button type="button" onClick={() => edit(addCanvasActivity(o.phase))}><span aria-hidden="true">＋</span> Add activity</button>
          <button type="button" aria-pressed={multi} onClick={() => setMulti((m) => !m)}>☑ Select several</button>
          {picked.length > 1 && <button type="button" onClick={() => setPicked([])}>{`Clear selection (${picked.length})`}</button>}
        </>}
        {links.from && <span className="ac-proc-hint" role="status">{`Click the activity ${links.from} leads to (Escape cancels)`}</span>}
        <p className="ac-proc-live" aria-live="polite">
          {sel ? `Selected: ${sel.id} ${sel.label}${sel.inScope === false ? ' (out of scope)' : ''}${picked.length > 1 ? ` (+${picked.length - 1} more)` : ''}`
            : 'No activity selected'}
        </p>
      </div>
      <DiagramOptions name={name} o={o} set={set} views={!!roleLanes} phases={phases} used={used.filter(Boolean)} colours={!!facts}
        zoomLabel={picked.length || !shown ? 'Zoom to selection' : 'Zoom to filtered'} onZoomSel={fit ? () => setCam(fit) : null} onFind={onFind}
        onTidy={editable ? () => { tidyProcessLayout(o.phase); toast(`Layout tidied${o.phase ? ` (${o.phase})` : ''} (Ctrl+Z undoes)`); } : null}
        onExport={(k) => { if (svg.current) exportDiagram(svg.current, drawn.box, title, k); }} />
      <div ref={box} className={`ac-proc-canvas${links.from ? ' is-linking' : ''}${multi ? ' is-selecting' : ''}`} tabIndex={0} role="group"
        {...handlers} onKeyDown={onKeyDown}
        aria-label={`${name}: + and − zoom, arrows pan, 0 fits, two fingers pinch, N / P select the next / previous activity, Enter opens its menu; ${
          ''}the activity table below lists the same elements`}>
        <svg ref={svg} className={readable ? 'is-readable' : 'is-overview'} viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} onPointerDown={band.onPointerDown}
          role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d ${tableId}`} preserveAspectRatio="xMidYMid meet">
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{desc}</desc>
          <Shapes d={drawn} selected={selected} onPick={onPick} labels={labels} extra={extra} onOpen={editable ? edit : undefined}
            onDrag={editable ? drag.onDrag : undefined} onMenu={editable ? onMenu : undefined} onEdge={editable ? links.onEdge : undefined} />
          {links.edge && <EdgeHandles d={drawn} id={links.edge.id} pull={links.pull} onHandle={links.onHandle} />}
          {dragParts(drag.ghost, unit)}
          {bandPart(band.band)}
          {editable && !drag.ghost && selectedMore(sel, unit, onMenu)}
          {o.freezePhases && <FrozenPhases d={drawn} v={v} px={px2} />}
          {o.freeze && <FrozenLanes d={drawn} v={v} px={px2} />}
        </svg>
        {o.map && minimap(drawn, v, selected, (p) => setCam((c) => centreOn(drawn.box, p, Math.max(c.s, 2))))}
      </div>
      {editable && menu && (drawn.shapes.some((s) => s.id === menu.id && s.kind === 'sub')
        ? <SubMenu at={menu} collapsed={collapsed.has(menu.id)} onClose={closeMenu}
          onCollapse={(sid, on) => set('collapsed', on ? [...o.collapsed, sid] : o.collapsed.filter((x) => x !== sid))} />
        : <ActivityMenu at={menu} picked={picked} onEdit={edit} onLink={links.startLink} onClose={closeMenu} />)}
      {editable && links.edge && <EdgeMenu at={links.edge} onClose={links.closeEdge} />}
    </div>
  );
}
