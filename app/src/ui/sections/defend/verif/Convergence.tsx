import type { ConvCheck } from '@/domain/pdc/verifConvergence';

/** Convergence checks: coded invariants with an id, a verdict and the observed detail. */
export function Convergence({ checks }: { checks: ConvCheck[] }) {
  return (
    <section className="ac-panel" aria-label="Convergence checks">
      <h2>✅ Convergence checks (v13.2)</h2>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Check</th><th>Invariant</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>{checks.map((x) => (
          <tr key={x.id}><td style={{ fontWeight: 'var(--ac-font-weight-semibold)', color: 'var(--ac-blue)' }}>{x.id}</td><td>{x.name}</td>
            <td style={{ textAlign: 'center', fontWeight: 'var(--ac-font-weight-bold)', color: x.pass ? 'var(--ac-teal-700)' : 'var(--ac-danger-800)' }}>{x.pass ? 'PASS' : 'FAIL'}</td><td style={{ fontSize: 'var(--ac-font-size-sm)', color: 'var(--ac-neutral-750)' }}>{x.detail}</td></tr>
        ))}</tbody>
      </table></div>
      <p className="ac-muted">{checks.filter((x) => !x.pass).length} failing of {checks.length} invariants.</p>
    </section>
  );
}
