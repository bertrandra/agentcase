import type { ConvCheck } from '@/domain/pdc/verifConvergence';

/** Convergence checks: coded invariants with an id, a verdict and the observed detail. */
export function Convergence({ checks }: { checks: ConvCheck[] }) {
  return (
    <section className="ac-panel" aria-label="Convergence checks">
      <h2>✅ Convergence checks (v13.2)</h2>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Check</th><th>Invariant</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>{checks.map((x) => (
          <tr key={x.id}><td style={{ fontWeight: 600, color: 'var(--ac-blue)' }}>{x.id}</td><td>{x.name}</td>
            <td style={{ textAlign: 'center', fontWeight: 700, color: x.pass ? '#00828E' : '#8F3237' }}>{x.pass ? 'PASS' : 'FAIL'}</td><td style={{ fontSize: 11, color: '#555' }}>{x.detail}</td></tr>
        ))}</tbody>
      </table></div>
      <p className="ac-muted">{checks.filter((x) => !x.pass).length} failing of {checks.length} invariants computed by this build. The analytical-module invariants of the legacy (eligibility, abaques, AI-Act, risk, coaching, measurement socle, gates, pilot sizing, agent catalogue, loop calibration, verification tax, supervision, Monte Carlo, flow, evidence) are not part of this build.</p>
    </section>
  );
}
