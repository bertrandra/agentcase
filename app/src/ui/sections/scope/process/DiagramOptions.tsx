import { useId } from 'react';
import { COLOUR_ORDER } from '@/domain/process/profile';

/** What the 🧩 Process diagram knows of an activity beyond its shape (from the activity table's rows): its colour categories and its scope. */
export interface ActFacts { type: string; authority: string; counted: boolean }
export type DiagramColour = '' | 'type' | 'authority';
const COLOURS: [DiagramColour, string][] = [['', 'None'], ['type', 'Task type (manual, human, agent…)'], ['authority', 'AI authority (assistance, copilot…)']];

/** The class of an activity's colour (`ac-bpmn-cat-N`, the N-th chart colour of the theme), '' when not coloured. */
export function colourClass(mode: DiagramColour, f: ActFacts | undefined): string {
  if (!mode || !f) return '';
  const i = COLOUR_ORDER[mode].indexOf(mode === 'type' ? f.type : f.authority);
  return i < 0 ? '' : `ac-bpmn-cat-${(i % 8) + 1}`;
}

interface Props {
  name: string; hideOut: boolean; onHideOut: (v: boolean) => void; colour: DiagramColour; onColour: (v: DiagramColour) => void;
  /** the categories drawn (the legend), in colour order */
  used: string[]; zoomLabel: string; onZoomSel: (() => void) | null; colours: boolean;
}
/**
 * The display options of the diagram (view state, never in the case): hide the activities out of scope, colour the activities by task type or AI
 * authority (with its legend), and zoom to the selected activities (Ctrl / Shift + click adds one) or, with none, to those the filters keep.
 */
export function DiagramOptions({ name, hideOut, onHideOut, colour, onColour, used, zoomLabel, onZoomSel, colours }: Props) {
  const id = useId();
  return (
    <div className="ac-form-row ac-proc-diagram-opts" role="group" aria-label={`${name} display`}>
      <label><input type="checkbox" checked={hideOut} onChange={(e) => onHideOut(e.target.checked)} /> Hide out-of-scope activities</label>
      {colours && <>
        <label htmlFor={`${id}-c`}>Colours</label>
        <select id={`${id}-c`} value={colour} onChange={(e) => onColour(e.target.value as DiagramColour)}>
          {COLOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </>}
      <button type="button" disabled={!onZoomSel} onClick={() => onZoomSel?.()}>{zoomLabel}</button>
      {colour && used.length > 0 && (
        <ul className="ac-proc-legend" aria-label={`Colours by ${colour === 'type' ? 'task type' : 'AI authority'}`}>
          {used.map((c) => <li key={c}><span className={`ac-proc-swatch ${colourClass(colour, colour === 'type'
            ? { type: c, authority: '', counted: true } : { type: '', authority: c, counted: true })}`} aria-hidden="true" />{c}</li>)}
        </ul>
      )}
    </div>
  );
}
