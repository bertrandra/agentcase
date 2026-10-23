import { METRICS, metricExtremes, metricValue, lifecycleStatusLabel, type StrategyRow } from '@/domain/verdict';
import type { CaseState } from '@/domain';
import { Badge } from '@/ui/widgets/cards';

const k = (n: number) => `${n < 0 ? '−' : ''}€${Math.round(Math.abs(n) / 1000).toLocaleString('en-US')}k`;
const dots = (v: number) => '●'.repeat(v) + '○'.repeat(5 - v);

function fmt(key: string, v: number | null): string {
  if (v != null && isNaN(v)) return 'n/a';   // horizon beyond 3 years: the net benefit is undefined (legacy limitation)
  if (key === 'roi') return v == null ? '—' : `${Math.round(v * 100)}%`;
  if (key === 'tco') return k(v as number);
  if (key === 'payback') return v == null ? '—' : `Year ${v}`;
  if (key === 'aiCoverage' || key === 'humanSup') return `${(v as number).toFixed(1)}%`;
  return dots(v as number);
}

/** The seven strategies × seven metrics; green = best per metric, red = worst. */
export function MetricTable({ R, horizon, s }: { R: StrategyRow[]; horizon: number; s: CaseState }) {
  return (
    <>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Metric</th>{R.map((r) => <th key={r.id} title={r.desc} style={{ textAlign: 'center' }}>{r.icon}<br />{r.label}</th>)}</tr></thead>
        <tbody>{METRICS.map((m) => {
          const ex = metricExtremes(R, m);
          return (
            <tr key={m.k}><td style={{ whiteSpace: 'nowrap' }}>{m.k === 'tco' ? `TCO (${horizon}-yr)` : m.label} <Badge tone={m.declared ? 'amber' : 'blue'}>{m.declared ? 'declared' : 'computed'}</Badge></td>
              {R.map((r, i) => {
                const v = ex.vals[i] as number, best = v === ex.best, worst = v === ex.worst && ex.best !== ex.worst;
                return <td key={r.id} data-rank={best ? 'best' : worst ? 'worst' : undefined} style={{ textAlign: 'center', background: best ? 'var(--ac-success-50)' : undefined, fontWeight: best ? 'var(--ac-font-weight-bold)' : undefined,
                  color: best ? 'var(--ac-teal)' : worst ? 'var(--ac-brick)' : undefined }}>{fmt(m.k, metricValue(r, m.k))}</td>;
              })}</tr>
          );
        })}</tbody>
        <tfoot><tr className="ac-muted"><td>Target blended rate</td>{R.map((r) => <td key={r.id} style={{ textAlign: 'center' }}>€{Math.round(r.computed.tgtTJM)}/d</td>)}</tr></tfoot>
      </table></div>
      <p className="ac-muted">Evaluated live on the current scenario invariants — product status <strong>{lifecycleStatusLabel(s)}</strong>, current phase/artefact scope, team, rate card and horizon.
        Green = best per metric, red = worst. Declared metrics are editable consulting benchmarks (v12.23 editor).</p>
    </>
  );
}
