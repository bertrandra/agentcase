import { memo, useId, useMemo, useState } from 'react';
import { setActivityRaci } from '@/controllers/org';
import { readRaci, type Raci } from '@/domain/org';
import { readProcess, type XDocument } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { DecisionsPanel } from '../process/DecisionsPanel';
import { counted, type Row } from '../process/tableModel';
import { setStudio, useStudio } from './view';

/** The letters a role holds on an activity, in the order a click cycles them. */
const CYCLE = ['', 'R', 'A', 'RA', 'C', 'I'] as const;
type Cell = (typeof CYCLE)[number];
const SHOW: Record<Cell, string> = { '': '', R: 'R', A: 'A', RA: 'R·A', C: 'C', I: 'I' };
const SAY: Record<Cell, string> = { '': 'none', R: 'Responsible', A: 'Accountable', RA: 'Responsible and Accountable', C: 'Consulted', I: 'Informed' };
export function cellOf(r: Raci, role: string): Cell {
  const R = r.R.includes(role), A = r.A === role;
  return R && A ? 'RA' : R ? 'R' : A ? 'A' : r.C.includes(role) ? 'C' : r.I.includes(role) ? 'I' : '';
}
/** The RACI with the role moved to the next letters of the cycle (one Accountable: taking A replaces the previous one). */
export function cycled(r: Raci, role: string): Raci {
  const next = CYCLE[(CYCLE.indexOf(cellOf(r, role)) + 1) % CYCLE.length]!;
  const out: Raci = { R: r.R.filter((x) => x !== role), C: r.C.filter((x) => x !== role), I: r.I.filter((x) => x !== role) };
  if (r.A && r.A !== role) out.A = r.A;
  if (next.includes('R')) out.R = [...out.R, role];
  if (next.includes('A')) out.A = role;
  if (next === 'C') out.C = [...out.C, role];
  if (next === 'I') out.I = [...out.I, role];
  if (r.teams) out.teams = r.teams;
  return out;
}

/**
 * 🗺️ Process studio › Roles & decisions: the actors by team skill (with the in-scope activities each is Responsible for), the RACI of the in-scope
 * activities as a grid edited in place (a click cycles R → A → R·A → C → I → none, one undoable step), and the decisions (the 🧩 Process panel).
 */
export const RolesTab = memo(function RolesTab({ doc, rows }: { doc: XDocument; rows: Row[] }) {
  const id = useId(), sub = useStudio((s) => s.rolesView), v = readProcess(doc), [extra, setExtra] = useState<string[]>([]);
  const inScope = rows.filter(counted), raci = useMemo(() => new Map(readRaci(doc).map((a) => [a.id, a])), [doc]);
  const rCount = (role: string) => inScope.filter((r) => raci.get(r.id)?.raci.R.includes(role)).length;
  const actors = v.actors;
  const skills = useMemo(() => {
    const m = new Map<string, typeof actors>();
    for (const a of actors) { const k = a.kind === 'agent' ? 'Agents' : a.teamSkill || 'No team skill'; m.set(k, [...(m.get(k) ?? []), a]); }
    return [...m].sort((a, b) => (a[0] === 'Agents' ? 1 : b[0] === 'Agents' ? -1 : a[0].localeCompare(b[0])));
  }, [actors]);
  const roles = v.actors.filter((a) => a.kind !== 'agent');
  const cols = roles.filter((a) => extra.includes(a.id) || inScope.some((r) => cellOf(raci.get(r.id)?.raci ?? { R: [], C: [], I: [] }, a.id)));
  const click = (activity: string, role: string) => {
    const cur = raci.get(activity);
    if (!cur) return;
    if (!setActivityRaci(activity, cycled(cur.raci, role))) toast('RACI change refused');
  };
  return (
    <div className="ac-studio-stack">
      <div role="group" aria-label="View" className="ac-studio-seg ac-studio-seg-start">
        <button type="button" aria-pressed={sub === 'raci'} onClick={() => setStudio({ rolesView: 'raci' })}>Roles &amp; RACI</button>
        <button type="button" aria-pressed={sub === 'decisions'} onClick={() => setStudio({ rolesView: 'decisions' })}>Decisions</button>
      </div>
      {sub === 'decisions' ? <section className="ac-studio-card"><DecisionsPanel doc={doc} /></section> : (
        <div className="ac-studio-split">
          <section className="ac-studio-card ac-studio-side" aria-labelledby={`${id}-r`}>
            <h2 id={`${id}-r`}>Actors by team skill</h2>
            <p className="ac-muted">{v.actors.filter((a) => a.kind !== 'agent').length} roles · {v.actors.filter((a) => a.kind === 'agent').length} agents.
              The number: in-scope activities it is Responsible for.</p>
            {skills.map(([skill, list]) => (
              <div key={skill} className="ac-studio-skill">
                <h3>{skill} <span className="ac-muted">{list.length}</span></h3>
                <ul className="ac-studio-chips">{list.map((a) => {
                  const n = a.kind === 'agent' ? inScope.filter((r) => r.agent === a.name).length : rCount(a.id);
                  return <li key={a.id} data-kind={a.kind} data-busy={n > 0 || undefined}>{a.name}{n > 0 && <strong> {n}</strong>}</li>;
                })}</ul>
              </div>
            ))}
          </section>
          <section className="ac-studio-card ac-studio-main" aria-labelledby={`${id}-g`}>
            <h2 id={`${id}-g`}>RACI of the in-scope activities</h2>
            <div className="ac-studio-head">
              <p className="ac-muted">Click a cell: R → A → R·A → C → I → none. One Accountable per activity: taking A moves it.</p>
              <label className="ac-studio-field">Add a role column
                <select value="" onChange={(e) => e.target.value && setExtra([...extra, e.target.value])}>
                  <option value="">—</option>{roles.filter((r) => !cols.includes(r)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            </div>
            {inScope.length === 0 ? <p className="ac-muted">No activity in scope.</p> : (
              <div className="ac-table-wrap" tabIndex={0}>
                <table className="ac-studio-raci">
                  <thead><tr><th scope="col">Activity</th>{cols.map((c) => <th key={c.id} scope="col">{c.name}</th>)}</tr></thead>
                  <tbody>{inScope.map((r) => {
                    const cur = raci.get(r.id)?.raci ?? { R: [], C: [], I: [] };
                    return (
                      <tr key={r.id}><th scope="row"><strong>{r.id}</strong> {r.name}</th>
                        {cols.map((c) => {
                          const cell = cellOf(cur, c.id);
                          return <td key={c.id}><button type="button" className="ac-studio-raci-cell" data-cell={cell || 'none'}
                            onClick={() => click(r.id, c.id)}>
                            <span className="ac-sr">{`${c.name} on ${r.id}:`}</span>{' '}{SHOW[cell] || <span
                              className="ac-sr">{SAY[cell]}</span>}</button></td>;
                        })}
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
});
