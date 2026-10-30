import type { ActivityAudit } from '@/domain/audit';

const pct = (x: number): string => `${Math.round(x * 1000) / 10} %`;
const num = (x: number | null): string => (x === null ? '—' : String(Math.round(x * 100) / 100));

/** Observed versus modelled (F-B28): the in-scope activities with an observed value to compare. A view: no figure reads it. */
export function Observed({ rows }: { rows: readonly ActivityAudit[] }) {
  const shown = rows.filter((r) => r.inScope && (r.hoursPerMonth !== null || r.reworkRate !== null || r.automation || r.fte.length));
  return (
    <>
      <h2 id="ac-audit-obs-h">Observed versus modelled</h2>
      {shown.length === 0 ? <p className="ac-muted">No observed value to compare yet.</p> : (
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table" aria-labelledby="ac-audit-obs-h">
            <thead><tr><th scope="col">Activity</th><th scope="col">Effort (model)</th><th scope="col">Observed h/month</th>
              <th scope="col">Rework observed / model</th>
              <th scope="col">Automation → authority / model</th><th scope="col">FTE share observed / model</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.id} · {r.name}</th><td>{r.effort}</td><td>{num(r.hoursPerMonth)}</td>
                <td>{r.reworkRate === null ? '—' : pct(r.reworkRate)} / {r.reworkFlows.map((f) => pct(f.probability)).join(', ') || '—'}</td>
                <td>{r.automation ? `${r.automation} → ${r.impliedAuthority ?? '?'}` : '—'} / {r.aiAuthority}</td>
                <td>{r.fte.map((f) => `${f.role} ${num(f.observed)} % / ${num(f.modelled)} %`).join('; ') || '—'}</td>
              </tr>))}</tbody>
          </table>
        </div>)}
    </>
  );
}
