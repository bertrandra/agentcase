import { memo, useMemo } from 'react';
import { dmnBindingState } from '@/controllers/decisionFiles';
import { togglePhase } from '@/controllers/scope';
import { raciDiagnostics, readRaci } from '@/domain/org';
import { readProcess, type XDocument } from '@/domain/process';
import { counted, type Row } from '../process/tableModel';
import { selectActivity } from '../process/view';
import { Lifecycle } from './Lifecycle';
import { mapLayout, phaseStats } from './model';
import { focusPhase, setStudio, useStudio } from './view';

/**
 * 🗺️ Process studio › Map: the process at a glance — key figures, the lifecycle in the display chosen (flow, V-cycle, agile loop, agentic; the
 * cross-cutting phase as a band), a phase in the side panel with its in-scope activities and its switch, and the model's checks. Switching a phase is
 * the 🎯 Phase scope command (one undoable step).
 */
export const MapTab = memo(function MapTab({ doc, rows }: { doc: XDocument; rows: Row[] }) {
  const sel = useStudio((s) => s.phase), by = useStudio((s) => s.mapColour), view = useStudio((s) => s.mapView);
  const v = readProcess(doc), stats = useMemo(() => phaseStats(v.phases, rows), [v.phases, rows]), lay = mapLayout(stats);
  const maxEffort = Math.max(1, ...stats.map((s) => s.effort));
  const cur = stats.find((s) => s.id === sel) ?? stats.find((s) => s.inScope) ?? stats[0];
  const inScope = rows.filter(counted), agents = v.actors.filter((a) => a.kind === 'agent').length;
  const known = new Set(v.actors.map((a) => a.id));
  const noR = readRaci(doc).filter((a) => inScope.some((r) => r.id === a.id)).filter((a) => raciDiagnostics(a, known).some((d) => d.code === 'noResponsible'));
  const dmn = dmnBindingState(), loops = v.flows.filter((f) => f.rework).length;
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
            <div role="group" aria-label="Show on each phase" className="ac-studio-seg" hidden={view === 'agentic'}>
              <button type="button" aria-pressed={by === 'scope'} onClick={() => setStudio({ mapColour: 'scope' })}>In scope</button>
              <button type="button" aria-pressed={by === 'effort'} onClick={() => setStudio({ mapColour: 'effort' })}>Effort</button>
            </div>
          </div>
          <Lifecycle stats={stats} selected={cur?.id} by={by} view={view} max={maxEffort} />
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
