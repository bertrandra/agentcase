import { memo, useCallback, useId, useMemo } from 'react';
import { readRaci } from '@/domain/org';
import { readProcess, type XDocument } from '@/domain/process';
import { counted, type Row } from '../process/tableModel';
import { selectActivity, useProcessView } from '../process/view';
import { Inspector } from './Inspector';
import { phaseLanes, phaseStats } from './model';
import { setStudio, useStudio } from './view';

const AUTH_KEY: Record<string, string> = {
  Autonomous: 'auto', 'Supervised autonomous': 'supervised', Copilot: 'copilot', Assistance: 'assist', Compliance: 'compliance',
};

/**
 * 🗺️ Process studio › Phase focus: one phase at a time, readable — a row per role (the agents in their own rows), the activities in flow order,
 * coloured
 * by task type or AI authority; out-of-scope activities on request; the rework loops of the phase; the inspector of the selected activity on the
 * side. The whole BPMN diagram stays in its own tab.
 */
export const PhaseTab = memo(function PhaseTab({ doc, rows }: { doc: XDocument; rows: Row[] }) {
  const id = useId(), v = readProcess(doc), st = useStudio((s) => s), selected = useProcessView((s) => s.selected);
  const stats = useMemo(() => phaseStats(v.phases, rows), [v.phases, rows]);
  const phase = st.phase && stats.some((s) => s.id === st.phase) ? st.phase : (stats.find((s) => s.inScope)?.id ?? stats[0]?.id ?? '');
  const cur = stats.find((s) => s.id === phase);
  const raci = useMemo(() => new Map(readRaci(doc).map((a) => [a.id, a.raci.R[0]])), [doc]);
  const names = useMemo(() => new Map(v.actors.map((a) => [a.id, a.name])), [v.actors]);
  const responsible = useCallback((a: string) => { const r = raci.get(a); return r ? names.get(r) ?? r : undefined; }, [raci, names]);
  const { acts, lanes } = useMemo(() => phaseLanes(rows, phase, st.showOff, responsible), [rows, phase, st.showOff, responsible]);
  const ids = new Set(acts.map((a) => a.id)), off = rows.filter((r) => r.phase === phase && !counted(r)).length;
  const loops = v.flows.filter((f) => f.rework && (ids.has(f.rework.activityA) || ids.has(f.rework.activityB)));
  const sel = rows.find((r) => r.id === selected);
  return (
    <div className="ac-studio-split">
      <div className="ac-studio-main ac-studio-stack">
        <section className="ac-studio-card ac-studio-head" aria-label="Phase in focus">
          <label className="ac-studio-field">Phase
            <select value={phase} onChange={(e) => setStudio({ phase: e.target.value })}>
              {stats.map((s) => <option key={s.id} value={s.id}>{`${s.id} · ${s.name} (${s.on ? `${s.inScope}/${s.total} in scope` : 'off'})`}</option>)}
            </select>
          </label>
          <p className="ac-muted">{cur ? `${cur.total} activities · ${cur.inScope} in scope · ${lanes.length} lane(s) shown${cur.on ? '' : ' · phase off'}`
            : ''}</p>
          <div className="ac-studio-actions">
            <div role="group" aria-label="Colour by" className="ac-studio-seg">
              <button type="button" aria-pressed={st.colour === 'type'} onClick={() => setStudio({ colour: 'type' })}>Task type</button>
              <button type="button" aria-pressed={st.colour === 'authority'} onClick={() => setStudio({ colour: 'authority' })}>AI authority</button>
            </div>
            <button type="button" aria-pressed={st.showOff} disabled={!off} onClick={() => setStudio({ showOff: !st.showOff })}>
              {st.showOff ? `Hide out-of-scope (${off})` : `Show out-of-scope (${off})`}</button>
            <button type="button" onClick={() => setStudio({ tab: 'bpmn' })}>Open the BPMN diagram</button>
          </div>
        </section>
        <section className="ac-studio-card" aria-labelledby={`${id}-d`}>
          <h2 id={`${id}-d`}>{cur ? `${cur.id} · ${cur.name}` : 'Phase'}: who does what, in flow order</h2>
          {acts.length === 0 ? <p
            className="ac-muted">No activity {st.showOff ? 'in this phase' : 'in scope in this phase'}
            {off && !st.showOff ? ': show the out-of-scope ones' : ''}.</p> : (
            <div className="ac-table-wrap" tabIndex={0}>
              <table className="ac-studio-lanes">
                <thead><tr><th scope="col">Lane</th>{acts.map((a, i) => <th key={a.id} scope="col">Step {i + 1}</th>)}</tr></thead>
                <tbody>{lanes.map((l) => (
                  <tr key={l.id} data-kind={l.kind}>
                    <th scope="row">{l.name} <span>{l.kind}</span></th>
                    {l.cells.map((c, i) => (
                      <td key={c?.id ?? `${l.id}-${i}`}>{c && (
                        <button type="button" className="ac-studio-task" aria-pressed={c.id === selected} data-off={!counted(c) || undefined}
                          data-type={c.type === 'Agent' ? 'agent' : 'human'} data-auth={AUTH_KEY[c.aiAuthority] ?? 'other'} data-by={st.colour}
                          onClick={() => selectActivity(c.id === selected ? null : c.id)}>
                          <span className="ac-studio-task-id">{c.id}</span> <span className="ac-studio-task-name">{c.name}</span>{' '}
                          <span className="ac-studio-task-meta">
                            {st.colour === 'type' ? `${c.type} · effort ${c.effort}` : c.aiAuthority}{counted(c) ? '' : ' · out of scope'}</span>
                        </button>)}</td>
                    ))}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <ul className="ac-studio-legend" aria-label="Legend">
            {st.colour === 'type'
              ? <><li><span className="ac-studio-key" data-key="agent" aria-hidden="true" />Agent task</li><li><span className="ac-studio-key"
                data-key="human" aria-hidden="true" />Human or manual task</li></>
              : <><li><span className="ac-studio-key" data-key="auto" aria-hidden="true" />Autonomous</li><li><span className="ac-studio-key"
                data-key="supervised" aria-hidden="true" />Supervised autonomous</li>
                <li><span className="ac-studio-key" data-key="copilot" aria-hidden="true" />Copilot or assistance</li></>}
            {loops.map((f) => <li key={f.id}><span className="ac-studio-key" data-key="rework"
              aria-hidden="true" />Rework {f.rework!.activityB} → {f.rework!.activityA},{' '}
              {Math.round(f.rework!.probability * 100)} %</li>)}
          </ul>
        </section>
      </div>
      <Inspector doc={doc} row={sel} />
    </div>
  );
});
