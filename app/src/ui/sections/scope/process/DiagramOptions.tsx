import { useId, useState } from 'react';
import { AUDIT_PROGRESS } from '@/domain/audit';
import { DIAGRAM_VIEWS, type DiagramViewId } from '@/domain/process';
import { COLOUR_ORDER } from '@/domain/process/profile';
import type { ViewOptions } from './useDiagramView';

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
  name: string;
  /** the display options (`useDiagramView`) and their setter */
  o: ViewOptions; set: <K extends keyof ViewOptions>(k: K, v: ViewOptions[K]) => void;
  /** the diagram offers points of view (the delivery process) */
  views: boolean;
  phases: { id: string; label: string }[];
  /** the categories drawn (the legend), in colour order */
  used: string[]; zoomLabel: string; onZoomSel: (() => void) | null; colours: boolean;
  /** owner, 2026-11-05: find an activity (id or name: the message when none), tidy the layout (null: not editable), the drawing as an image */
  onFind: (q: string) => string | null; onTidy: (() => void) | null; onExport: (kind: 'svg' | 'png') => void;
}
/**
 * The display options of the diagram (view state, never in the case, kept in this browser): point of view, phase shown, hide the activities out of
 * scope (their links follow) and compact, freeze the roles and the phases at the edges, colours (with their legend), the minimap; zoom to the
 * selected activities or, with none, to those the filters keep; find an activity; tidy the layout; save the drawing as SVG or PNG.
 */
export function DiagramOptions({ name, o, set, views, phases, used, zoomLabel, onZoomSel, colours, onFind, onTidy, onExport }: Props) {
  const id = useId(), [q, setQ] = useState(''), [miss, setMiss] = useState('');
  const box = (k: 'hideOut' | 'compact' | 'freeze' | 'freezePhases' | 'map', label: string, text: string, disabled = false) => (
    <label><input type="checkbox" aria-label={label} checked={o[k]} disabled={disabled} onChange={(e) => set(k, e.target.checked)} />{` ${text}`}</label>
  );
  return (
    <div className="ac-form-row ac-proc-diagram-opts" role="group" aria-label={`${name} display`}>
      {views && <>
        <label htmlFor={`${id}-v`}>View</label>
        <select id={`${id}-v`} value={o.pov} onChange={(e) => set('pov', e.target.value as DiagramViewId)}>
          {DIAGRAM_VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </>}
      <label htmlFor={`${id}-ph`}>Show phase</label>
      <select id={`${id}-ph`} value={o.phase} onChange={(e) => set('phase', e.target.value)}>
        <option value="">All phases</option>
        {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {box('hideOut', 'Hide out-of-scope activities', 'Hide out-of-scope')}
      {box('compact', 'Compact the layout', 'Compact', !o.hideOut)}
      {box('freeze', 'Freeze roles on the left', 'Freeze roles')}
      {box('freezePhases', 'Freeze phases at the top', 'Freeze phases')}
      {box('map', 'Minimap of the whole diagram', 'Minimap')}
      {colours && <>
        <label htmlFor={`${id}-c`}>Colours</label>
        <select id={`${id}-c`} value={o.colour} onChange={(e) => set('colour', e.target.value as DiagramColour)}>
          {COLOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </>}
      <button type="button" disabled={!onZoomSel} onClick={() => onZoomSel?.()}>{zoomLabel}</button>
      <form className="ac-proc-find" role="search" aria-label={`Find in the ${name}`} onSubmit={(e) => { e.preventDefault(); setMiss(onFind(q) ?? ''); }}>
        <input type="search" aria-label="Find an activity (id or name)" placeholder="Find (id or name)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">🔍 Find</button>
        {miss && <span className="ac-muted" role="status">{miss}</span>}
      </form>
      {onTidy && <button type="button" onClick={onTidy}>🧹 Tidy layout</button>}
      <button type="button" onClick={() => onExport('svg')}>⬇ SVG</button>
      <button type="button" onClick={() => onExport('png')}>⬇ PNG</button>
      {o.colour && used.length > 0 && (
        <ul className="ac-proc-legend" aria-label={`Colours by ${LEGEND[o.colour]}`}>
          {used.map((c) => <li key={c}><span className={`ac-proc-swatch ${colourClass(o.colour, { type: c, authority: c, audit: c, counted: true })}`}
            aria-hidden="true" />{c}</li>)}
        </ul>
      )}
    </div>
  );
}
