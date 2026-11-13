import { memo, useMemo } from 'react';
import { dmnBindingState } from '@/controllers/decisionFiles';
import { togglePhase } from '@/controllers/scope';
import { raciDiagnostics, readRaci } from '@/domain/org';
import { readProcess, type XDocument } from '@/domain/process';
import { counted, type Row } from '../process/tableModel';
import { selectActivity } from '../process/view';
import { mapLayout, phaseStats, type PhaseStat } from './model';
import { focusPhase, setStudio, useStudio } from './view';

/** One phase of the map: id, name, its in-scope count (or its effort), on / off; selecting it shows it in the side panel. */
function PhaseNode({ s, selected, by, place, max }: { s: PhaseStat; selected: boolean; by: 'scope' | 'effort'; place?: string; max: number }) {
  const meta = by === 'effort' ? `${s.effort} effort pts · ${s.total} activities`
    : s.on ? `${s.inScope} of ${s.total} in scope` : `off · ${s.total} activities`;
  const state = !s.on ? 'off' : s.inScope ? 'in' : 'none';
  return (
    <button type="button" className="ac-studio-phase" data-state={state} data-place={place} aria-pressed={selected} onClick={() => setStudio({ phase: s.id })}>
      <span className="ac-studio-phase-id">{s.id}</span> <span className="ac-studio-phase-name">{s.name}</span> <span
        className="ac-studio-phase-meta">{meta}</span>
      <meter min={0} max={1} value={by === 'effort' ? s.effort / max : s.total ? s.inScope / s.total : 0}
        aria-hidden="true" />
    </button>
  );
}

/**
 * 🗺️ Process studio › Map: the process at a glance — key figures, the lifecycle drawn as a V (specify and build down, verify and qualify up; the
 * phases before and after on a rail; the cross-cutting phase as a band), a phase in the side panel with its in-scope activities and its switch,
 * and the model's checks. Switching a phase is the 🎯 Phase scope command (one undoable step).
 */
export const MapTab = memo(function MapTab({ doc, rows }: { doc: XDocument; rows: Row[] }) {
  const sel = useStudio((s) => s.phase), by = useStudio((s) => s.mapColour);
  const v = readProcess(doc), stats = useMemo(() => phaseStats(v.phases, rows), [v.phases, rows]), lay = mapLayout(stats);
  const maxEffort = Math.max(1, ...stats.map((s) => s.effort));
  const cur = stats.find((s) => s.id === sel) ?? stats.find((s) => s.inScope) ?? stats[0];
  const inScope = rows.filter(counted), agents = v.actors.filter((a) => a.kind === 'agent').length;
  const known = new Set(v.actors.map((a) => a.id));
  const noR = readRaci(doc).filter((a) => inScope.some((r) => r.id === a.id)).filter((a) => raciDiagnostics(a, known).some((d) => d.code === 'noResponsible'));
  const dmn = dmnBindingState(), loops = v.flows.filter((f) => f.rework).length;
  const node = (s: PhaseStat, place?: string) => (
    <PhaseNode key={s.id} s={s} selected={cur?.id === s.id} by={by} place={place} max={maxEffort} />
  );
  return (
    <div className="ac-studio-stack">
      <section className="ac-studio-kpis" aria-label="Key figures">
        <div className="ac-studio-card"><span
          className="ac-studio-eyebrow">Activities in scope</span><strong>{inScope.length} <small>of {rows.length}</small></strong></div>
        <div className="ac-studio-card"><span
          className="ac-studio-eyebrow">Phases on</span><strong>{stats.filter((s) => s.on).length} <small>of {stats.length}</small></strong></div>
        <div className="ac-studio-card"><span
          className="ac-studio-eyebrow">Effort in scope</span><strong>{inScope.reduce((t, r) => t + r.effort, 0)} <small>pts</small></strong></div>
        <div className="ac-studio-card"><span
          className="ac-studio-eyebrow">Agent tasks in scope</span>
          <strong>{inScope.filter((r) => r.type === 'Agent').length} <small>of {inScope.length}</small></strong></div>
        <div className="ac-studio-card"><span
          className="ac-studio-eyebrow">Actors</span><strong>{v.actors.length} <small>· {agents} agents</small></strong></div>
        <div className="ac-studio-card"><span className="ac-studio-eyebrow">Rework loops</span><strong>{loops}</strong></div>
      </section>
      <div className="ac-studio-split">
        <section className="ac-studio-card ac-studio-main" aria-labelledby="ac-studio-map-h">
          <div className="ac-studio-head">
            <h2 id="ac-studio-map-h">The lifecycle, phase by phase</h2>
            <div role="group" aria-label="Show on each phase" className="ac-studio-seg">
              <button type="button" aria-pressed={by === 'scope'} onClick={() => setStudio({ mapColour: 'scope' })}>In scope</button>
              <button type="button" aria-pressed={by === 'effort'} onClick={() => setStudio({ mapColour: 'effort' })}>Effort</button>
            </div>
          </div>
          {(lay.before.length > 0 || lay.after.length > 0) && (
            <div className="ac-studio-rail" role="group"
              aria-label="Phases before and after the V">{lay.before.map((s) => node(s))}{lay.after.map((s) => node(s))}</div>
          )}
          {lay.v.length > 0 && (
            <div className="ac-studio-v" role="group" aria-label="The V of the lifecycle" data-cols={lay.cols} data-rows={lay.rows}>
              {lay.v.map((x) => node(x.stat, `r${x.row}c${x.col}`))}
            </div>
          )}
          {lay.v.length > 0 && <p className="ac-studio-vlegend"><span>Specify and build ↘</span><span>↗ Verify and qualify</span></p>}
          {lay.band.map((s) => <div key={s.id} className="ac-studio-band">{node(s)}</div>)}
          <ul className="ac-studio-legend" aria-label="Legend">
            <li><span className="ac-studio-key" data-key="in" aria-hidden="true" />Phase on, activities in scope</li>
            <li><span className="ac-studio-key" data-key="none" aria-hidden="true" />Phase on, none in scope</li>
            <li><span className="ac-studio-key" data-key="off" aria-hidden="true" />Phase off</li>
            {by === 'effort' && <li>Bar: the phase&apos;s effort against the largest phase ({maxEffort} pts)</li>}
          </ul>
        </section>
        <aside className="ac-studio-side" aria-label="Phase and checks">
          {cur && (
            <section className="ac-studio-card" aria-labelledby="ac-studio-sel-h">
              <span className="ac-studio-eyebrow">Selected phase</span>
              <h2 id="ac-studio-sel-h" className="ac-studio-title">{cur.id} · {cur.name}</h2>
              <p className="ac-muted">{cur.on
                ? (cur.inScope ? 'Phase on: its in-scope activities count in the case.' : 'Phase on, but no activity is in scope.')
                : 'Phase off: none of its activities counts.'}</p>
              <dl className="ac-studio-dl">
                <dt>Activities</dt><dd>{cur.total}</dd><dt>In scope</dt><dd>{cur.inScope}</dd><dt>Effort (all)</dt><dd>{cur.effort}</dd>
              </dl>
              <ul className="ac-studio-acts">
                {rows.filter((r) => r.phase === cur.id && counted(r)).slice(0, 8).map((r) => (
                  <li key={r.id}><button type="button" onClick={() => { selectActivity(r.id); focusPhase(cur.id); }}>
                    <strong>{r.id}</strong> {r.name}<span className="ac-muted"> {r.agent || r.role}</span></button></li>
                ))}
              </ul>
              <div className="ac-studio-actions">
                <button type="button" className="ac-studio-primary" onClick={() => focusPhase(cur.id)}>Open the phase</button>
                <button type="button" onClick={() => togglePhase(cur.id, !cur.on)}>{cur.on ? 'Switch the phase off' : 'Switch the phase on'}</button>
              </div>
            </section>
          )}
          <section className="ac-studio-card" aria-labelledby="ac-studio-chk-h">
            <h2 id="ac-studio-chk-h">Model checks</h2>
            <ul className="ac-studio-checks">
              {dmn.unbound > 0 && <li data-level="medium"><strong>{dmn.unbound} decision(s) bound to no task</strong>
                <span>{dmn.generated ? 'The reference rule families: import them as a DMN file to bind them' : 'Bind them in Roles & decisions'}</span></li>}
              {noR.length > 0 ? <li data-level="high"><strong>{noR.length} in-scope activit{noR.length === 1 ? 'y' : 'ies'} with no Responsible</strong>
                <span>{noR.slice(0, 5).map((a) => a.id).join(', ')}</span></li>
                : <li data-level="ok"><strong>Every in-scope activity has a Responsible</strong>
                  <span>RACI complete on the {inScope.length} activities</span></li>}
              {lay.band.filter((b) => b.on && b.total && !b.inScope).map((b) => <li key={b.id}
                data-level="low"><strong>{b.name}: {b.total} activities, none in scope</strong>
                <span>They are counted nowhere</span></li>)}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
});
