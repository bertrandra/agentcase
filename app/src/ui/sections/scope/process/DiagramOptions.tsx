import { useId } from 'react';
import { AUDIT_PROGRESS } from '@/domain/audit';
import { DIAGRAM_VIEWS, type DiagramViewId } from '@/domain/process';
import { COLOUR_ORDER } from '@/domain/process/profile';

/** What the 🧩 Process diagram knows of an activity beyond its shape (the activity table's rows, the audit): its colour categories and its scope. */
export interface ActFacts { type: string; authority: string; audit: string; counted: boolean }
export type DiagramColour = '' | 'type' | 'authority' | 'audit';
const COLOURS: [DiagramColour, string][] = [['', 'None'], ['type', 'Task type (manual, human, agent…)'], ['authority', 'AI authority (assistance, copilot…)'],
  ['audit', 'Audit progress (planned, in progress, audited, closed)']];
const ORDER: Record<Exclude<DiagramColour, ''>, readonly string[]> = { type: COLOUR_ORDER.type, authority: COLOUR_ORDER.authority, audit: AUDIT_PROGRESS };
const LEGEND: Record<Exclude<DiagramColour, ''>, string> = { type: 'task type', authority: 'AI authority', audit: 'audit progress' };
/** The category of an activity in a colour mode. */
export const categoryOf = (mode: Exclude<DiagramColour, ''>, f: ActFacts): string => (mode === 'type' ? f.type : mode === 'authority' ? f.authority : f.audit);

/** The class of an activity's colour (`ac-bpmn-cat-N`, the N-th chart colour of the theme), '' when not coloured. */
export function colourClass(mode: DiagramColour, f: ActFacts | undefined): string {
  if (!mode || !f) return '';
  const i = ORDER[mode].indexOf(categoryOf(mode, f));
  return i < 0 ? '' : `ac-bpmn-cat-${(i % 8) + 1}`;
}

interface Props {
  name: string; hideOut: boolean; onHideOut: (v: boolean) => void; colour: DiagramColour; onColour: (v: DiagramColour) => void;
  /** with the out-of-scope activities hidden: close the space they leave (empty phases and roles dropped) */
  compact: boolean; onCompact: (v: boolean) => void;
  /** the point of view (null: the diagram offers none) */
  view: DiagramViewId | null; onView: (v: DiagramViewId) => void;
  /** the categories drawn (the legend), in colour order */
  used: string[]; zoomLabel: string; onZoomSel: (() => void) | null; colours: boolean;
  /** keep the lane (role) names at the left edge while panning */
  freeze: boolean; onFreeze: (v: boolean) => void;
  /** keep the phase names at the top edge while panning */
  freezePhases: boolean; onFreezePhases: (v: boolean) => void;
}
/**
 * The display options of the diagram (view state, never in the case): hide the activities out of scope (their links follow), freeze the roles (lanes)
 * at the left edge, colour the activities by task type or AI
 * authority (with its legend), and zoom to the selected activities (Ctrl / Shift + click adds one) or, with none, to those the filters keep.
 */
export function DiagramOptions({ name, hideOut, onHideOut, compact, onCompact, view, onView, colour, onColour, used, zoomLabel, onZoomSel, colours, freeze,
  onFreeze, freezePhases, onFreezePhases }: Props) {
  const id = useId();
  return (
    <div className="ac-form-row ac-proc-diagram-opts" role="group" aria-label={`${name} display`}>
      {view && <>
        <label htmlFor={`${id}-v`}>View</label>
        <select id={`${id}-v`} value={view} onChange={(e) => onView(e.target.value as DiagramViewId)}>
          {DIAGRAM_VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </>}
      <label><input type="checkbox" aria-label="Hide out-of-scope activities" checked={hideOut} onChange={(e) => onHideOut(e.target.checked)} />
        {' '}Hide out-of-scope</label>
      <label><input type="checkbox" aria-label="Compact the layout" checked={compact} disabled={!hideOut} onChange={(e) => onCompact(e.target.checked)} />
        {' '}Compact</label>
      <label><input type="checkbox" aria-label="Freeze roles on the left" checked={freeze} onChange={(e) => onFreeze(e.target.checked)} /> Freeze roles</label>
      <label><input type="checkbox" aria-label="Freeze phases at the top" checked={freezePhases} onChange={(e) => onFreezePhases(e.target.checked)} />
        {' '}Freeze phases</label>
      {colours && <>
        <label htmlFor={`${id}-c`}>Colours</label>
        <select id={`${id}-c`} value={colour} onChange={(e) => onColour(e.target.value as DiagramColour)}>
          {COLOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </>}
      <button type="button" disabled={!onZoomSel} onClick={() => onZoomSel?.()}>{zoomLabel}</button>
      {colour && used.length > 0 && (
        <ul className="ac-proc-legend" aria-label={`Colours by ${LEGEND[colour]}`}>
          {used.map((c) => <li key={c}><span className={`ac-proc-swatch ${colourClass(colour, { type: c, authority: c, audit: c, counted: true })}`}
            aria-hidden="true" />{c}</li>)}
        </ul>
      )}
    </div>
  );
}
