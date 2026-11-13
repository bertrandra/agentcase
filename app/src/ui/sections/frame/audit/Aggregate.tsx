import type { AuditRow } from '@/domain/portfolio/aggAudit';
import { useScopeAudit } from '@/store/selectionHooksAudit';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { STATUS_LABELS } from './Header';

const R = 'right' as const;
const pct = (x: number): string => `${Math.round(x * 1000) / 10} %`;
const COLS: AggColumn<AuditRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'own', header: 'Process', render: (r) => (r.own ? 'own (overridden)' : 'common') },
  { key: 'status', header: 'Audit', render: (r) => STATUS_LABELS[r.status] ?? 'none' },
  { key: 'cov', header: 'Activities audited', align: R, render: (r) => `${r.audited}/${r.inScope}` },
  { key: 'eff', header: 'Effort audited', align: R, render: (r) => pct(r.byEffort) },
  { key: 'gaps', header: 'Tooling gaps', align: R, render: (r) => String(r.gaps) },
  { key: 'over', header: 'Overlaps', align: R, render: (r) => String(r.overlaps) },
  { key: 'pains', header: 'Pain points', align: R, render: (r) => String(r.pains) },
  { key: 'cal', header: 'Calibrations', align: R, render: (r) => String(r.calibrations) },
];
/**
 * 🔎 Audit › Cockpit, Portfolio scope (F-B30, formerly the section's aggregate view): the audit of each product of the View — coverage, tooling gaps
 * and overlaps, pain points, calibrations — and the capabilities across the products with the tools in use.
 */
export function ProductsOverview() {
  const a = useScopeAudit(), vs = useViewScope(), n = a.rows.length;
  return (
    <section className="ac-audit-card" aria-labelledby="ac-audit-pf-h">
      <h2 id="ac-audit-pf-h">Audit by product — {vs.label}</h2>
      <StatRow>
        <Stat label="Products with audit data" value={`${a.audited}/${n}`} tone={a.audited ? 'teal' : 'amber'} />
        <Stat label="Capabilities with a gap" value={String(a.capabilities.filter((c) => c.gaps > 0).length)} />
      </StatRow>
      <AggregateTable caption={`Audit by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Products — ${vs.label}`, cells: { status: `${a.audited}/${n} audited` } }} />
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table"><caption>Tooling map across the products</caption>
          <thead><tr><th scope="col">Capability</th><th scope="col">Products</th><th scope="col">Products with a gap</th>
            <th scope="col">Tools in use</th></tr></thead>
          <tbody>{a.capabilities.map((c) => <tr key={c.capability}><th scope="row">{c.capability}</th><td>{c.products}</td><td>{c.gaps}</td>
            <td>{c.tools.join(', ') || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
