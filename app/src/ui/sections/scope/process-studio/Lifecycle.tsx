import { AUTONOMY_COLUMNS, autonomyColumn, loopCells, mapLayout, type PhaseStat } from './model';
import { setStudio, type MapView } from './view';

const VIEWS: { id: MapView; label: string; hint: string }[] = [
  { id: 'flow', label: 'Flow', hint: 'The phases in their order, left to right: no method implied' },
  { id: 'v', label: 'V-cycle', hint: 'Specify and build down the left, verify and qualify up the right' },
  { id: 'loop', label: 'Agile loop', hint: 'The delivery phases repeated in each increment, between the entry and the release' },
  { id: 'agentic', label: 'Agentic', hint: 'Each phase where its effort sits: agent-led, under oversight, assisted, human-only' },
];

/** One phase: id, name, its in-scope count, its effort or its agent share, on / off; selecting it shows it in the side panel. */
function PhaseNode({ s, selected, by, view, place, max }: {
  s: PhaseStat; selected: boolean; by: 'scope' | 'effort'; view: MapView; place?: string; max: number;
}) {
  const meta = view === 'agentic' ? `${s.authority} · agent ${s.agentShare} %`
    : by === 'effort' ? `${s.effort} effort pts · ${s.total} activities` : s.on ? `${s.inScope} of ${s.total} in scope` : `off · ${s.total} activities`;
  const value = view === 'agentic' ? s.agentShare / 100 : by === 'effort' ? s.effort / max : s.total ? s.inScope / s.total : 0;
  return (
    <button type="button" className="ac-studio-phase" data-state={!s.on ? 'off' : s.inScope ? 'in' : 'none'} data-place={place} aria-pressed={selected}
      onClick={() => setStudio({ phase: s.id })}>
      <span className="ac-studio-phase-id">{s.id}</span> <span className="ac-studio-phase-name">{s.name}</span>{' '}
      <span className="ac-studio-phase-meta">{meta}</span>
      <meter min={0} max={1} value={value} aria-hidden="true" />
    </button>
  );
}

/**
 * The lifecycle of the 🗺️ Process studio map, in four displays (owner's request 2026-11-13: the V-cycle is one option among others, not the model):
 * Flow (the phases in order), V-cycle, Agile loop (the delivery phases around an increment, the entry before and release and run after) and
 * Agentic (each phase in the column of the AI authority that carries most of its effort). The phases, their figures and their switch are the same.
 */
export function Lifecycle({ stats, selected, by, view, max }: { stats: PhaseStat[]; selected: string | undefined; by: 'scope' | 'effort'; view: MapView;
  max: number }) {
  const lay = mapLayout(stats), node = (s: PhaseStat, place?: string) => (
    <PhaseNode key={s.id} s={s} selected={selected === s.id} by={by} view={view} place={place} max={max} />
  );
  const core = lay.v.length ? lay.v.map((x) => x.stat) : [...lay.before, ...lay.after], ring = loopCells(core.length);
  const flow = stats.filter((s) => !lay.band.includes(s));
  return (
    <>
      <div role="group" aria-label="Display of the lifecycle" className="ac-studio-seg ac-studio-seg-start">
        {VIEWS.map((x) => <button key={x.id} type="button" aria-pressed={view === x.id} title={x.hint}
          onClick={() => setStudio({ mapView: x.id })}>{x.label}</button>)}
      </div>
      <p className="ac-muted">{VIEWS.find((x) => x.id === view)?.hint}. The display changes nothing in the case.</p>

      {view === 'flow' && <ol className="ac-studio-flow" aria-label="The phases in order">{flow.map((s) => <li key={s.id}>{node(s)}</li>)}</ol>}

      {view === 'v' && <>
        {(lay.before.length > 0 || lay.after.length > 0) && (
          <div className="ac-studio-rail" role="group"
            aria-label="Phases before and after the V">{lay.before.map((s) => node(s))}{lay.after.map((s) => node(s))}</div>
        )}
        {lay.v.length > 0 ? (
          <div className="ac-studio-v" role="group" aria-label="The V of the lifecycle" data-cols={lay.cols} data-rows={lay.rows}>
            {lay.v.map((x) => node(x.stat, `r${x.row}c${x.col}`))}
          </div>
        ) : <p className="ac-muted">This process has no V phases (V1, V2…): see Flow.</p>}
        {lay.v.length > 0 && <p className="ac-studio-vlegend"><span>Specify and build ↘</span><span>↗ Verify and qualify</span></p>}
      </>}

      {view === 'loop' && <>
        {lay.v.length > 0 && lay.before.length > 0 && <div className="ac-studio-rail" role="group" aria-label="Entry">{lay.before.map((s) => node(s))}</div>}
        <div className="ac-studio-v ac-studio-loop" role="group" aria-label="The delivery phases repeated in each increment" data-cols={4} data-rows={3}>
          {core.slice(0, ring.length).map((s, i) => node(s, ring[i]))}
          <p className="ac-studio-loop-centre" aria-hidden="true"><span>↻</span>Each increment (sprint, release)</p>
        </div>
        {core.length > ring.length && <div className="ac-studio-rail" role="group"
          aria-label="Other phases">{core.slice(ring.length).map((s) => node(s))}</div>}
        {lay.v.length > 0 && lay.after.length > 0 && <div className="ac-studio-rail" role="group"
          aria-label="Release and run">{lay.after.map((s) => node(s))}</div>}
      </>}

      {view === 'agentic' && (
        <div className="ac-studio-autonomy">
          {AUTONOMY_COLUMNS.map((c) => {
            const mine = stats.filter((s) => !lay.band.includes(s) && autonomyColumn(s) === c.id);
            return (
              <section key={c.id} aria-label={c.title} data-col={c.id}>
                <h3>{c.title} <span className="ac-muted">{c.hint}</span></h3>
                {mine.length ? mine.map((s) => node(s)) : <p className="ac-muted">No phase</p>}
              </section>
            );
          })}
        </div>
      )}

      {lay.band.map((s) => <div key={s.id} className="ac-studio-band">{node(s)}</div>)}
      <ul className="ac-studio-legend" aria-label="Legend">
        <li><span className="ac-studio-key" data-key="in" aria-hidden="true" />Phase on, activities in scope</li>
        <li><span className="ac-studio-key" data-key="none" aria-hidden="true" />Phase on, none in scope</li>
        <li><span className="ac-studio-key" data-key="off" aria-hidden="true" />Phase off</li>
        <li>Bar: {view === 'agentic' ? 'the agent share of the supervision, weighted by effort' : by === 'effort'
          ? `the phase's effort against the largest phase (${max} pts)` : 'the share of its activities in scope'}</li>
      </ul>
    </>
  );
}
