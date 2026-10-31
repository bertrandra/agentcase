import type { ProgrammeActivity, ProgrammeView } from '@/domain/programme';
import { eurK } from '../../../tuneB/fmt';
import { selectActivity, useProcessView } from '../view';

export const costText = (a: ProgrammeActivity): string =>
  (a.cost.amount === null ? '—' : `${eurK(a.cost.amount)}${a.cost.per === 'year 1' ? ' / yr (Y1)' : a.cost.per === 'horizon' ? ' over the horizon' : ''}`);
const lane = (v: ProgrammeView, role: string): string => v.lanes.find((l) => l.role === role)?.name ?? role;

/**
 * The programme's activities, one per row (F-B70): the accessible alternative of the programme diagram. The name selects the activity (diagram
 * highlight and parameter panel), like a click on its shape.
 */
export function ProgrammeTable({ v }: { v: ProgrammeView }) {
  const selected = useProcessView((s) => s.selected), phase = new Map(v.phases.map((p) => [p.phase, p.name]));
  return (
    <div className="ac-table-wrap ac-prog-table" tabIndex={0} role="region" aria-label="Activities of the transformation programme">
      <table className="ac-table">
        <caption className="ac-sr">Activities of the transformation programme: the same elements as its diagram, one per row</caption>
        <thead>
          <tr><th scope="col">Activity</th><th scope="col">Role (lane)</th><th scope="col">Phase</th><th scope="col">Instances</th>
            <th scope="col">Duration and placement</th><th scope="col">Cost</th></tr>
        </thead>
        <tbody>
          {v.activities.map((a) => {
            const on = a.id === selected;
            return (
              <tr key={a.id} className={on ? 'is-selected' : undefined}>
                <td>
                  <button type="button" className="ac-proc-sort" aria-pressed={on} onClick={() => selectActivity(on ? null : a.id)}
                    aria-label={`Select ${a.name}`}>{a.name}</button>
                  {!a.active && <span className="ac-proc-tag">module off</span>}
                </td>
                <td>{lane(v, a.lane)}</td>
                <td>{phase.get(a.phase)}</td>
                <td>{a.instances === null ? 'Case' : `× ${a.instances}`}</td>
                <td>{a.placement.text}</td>
                <td className="ac-proc-num">{costText(a)}</td>
              </tr>
            );
          })}
          {v.milestones.map((m) => {
            const on = m.id === selected;
            return (
              <tr key={m.id} className={on ? 'is-selected' : undefined}>
                <td>
                  <button type="button" className="ac-proc-sort" aria-pressed={on} onClick={() => selectActivity(on ? null : m.id)}
                    aria-label={`Select ${m.name}`}>{m.name}</button>
                  <span className="ac-proc-tag">{m.element === 'gateway' ? 'gateway' : 'milestone'}</span>
                </td>
                <td>{lane(v, m.lane)}</td>
                <td>{phase.get(m.phase)}</td>
                <td>{`× ${m.instances}`}</td>
                <td>{m.placement}</td>
                <td className="ac-proc-num">—</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The lanes (roles with their Y1 FTE from the operating model), the waves and the message flows to the delivery process. */
export function ProgrammeFacts({ v }: { v: ProgrammeView }) {
  return (
    <div className="ac-prog-facts">
      <div className="ac-table-wrap" tabIndex={0} role="region" aria-label="Lanes of the transformation programme">
        <table className="ac-table">
          <caption>Lanes (roles)</caption>
          <thead><tr><th scope="col">Role</th><th scope="col">FTE (Y1)</th><th scope="col">Activities</th></tr></thead>
          <tbody>
            {v.lanes.map((l) => (
              <tr key={l.id}>
                <td title={l.description}>{l.name}</td>
                <td className="ac-proc-num">{l.fteY1 === null ? '—' : l.fteY1.toFixed(2)}</td>
                <td>{v.activities.filter((a) => a.lane === l.role).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="ac-prog-list" aria-label="Message flows to the delivery process">
        {v.messageFlows.map((f) => <li key={f.id}>{`${f.name} (message flow to the delivery process)`}</li>)}
        {v.capacity !== null && <li>{`Transformation-team capacity: ${v.capacity} product(s) in setup at once (edited in a wave's panel)`}</li>}
        {v.waves.map((w) => (
          <li key={w.id}>
            <button type="button" className="ac-link" onClick={() => selectActivity(w.id)}>{`Wave: ${w.name}`}</button>
            {`: month ${w.start}, ${w.products.join(', ') || 'no product'}${w.dependency ? ` — ${w.dependency}` : ''}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
