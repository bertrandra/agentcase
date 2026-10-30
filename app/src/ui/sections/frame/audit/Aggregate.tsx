import type { AuditRow } from '@/domain/portfolio/aggAudit';
import { useScopeAudit } from '@/store/selectionHooksAudit';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { InputAggregate } from '../../aggregates/AggregateParts';
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
const help = <p>Aggregate view of the audit of each product (F-B30): coverage of its in-scope activities, tooling gaps and overlaps, pain points and
  calibrations; then the capabilities across the products with the tools in use. The audit belongs to the product&apos;s process (common, or its own).</p>;

/** 🔎 Audit — Aggregate view: coverage, gaps and the tooling map across the products and waves of the View. */
export default function AuditAggregate() {
  const a = useScopeAudit(), vs = useViewScope(), n = a.rows.length;
  return (
    <InputAggregate title="🔎 Audit" help={help} intro="the audit is kept in each product's process document.">
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
    </InputAggregate>
  );
}
