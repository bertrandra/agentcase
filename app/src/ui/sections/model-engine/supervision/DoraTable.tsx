import { setDoraMeasured } from '@/controllers/modelSupervision';
import { doraReadout, type DoraRow } from '@/domain/model/supView';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';

interface Row { key: string; label: string; row: DoraRow }

/** Derived DORA read-outs beside the client's measured values; a gap under 5 % is free evidence, a larger one a calibration signal. */
export function DoraTable() {
  const d = doraReadout(useCtx());
  const rows: Row[] = [
    { key: 'deployFreq', label: 'Deployment frequency', row: d.deploymentFrequency }, { key: 'changeFailure', label: 'Change failure rate', row: d.changeFailureRate },
    { key: 'leadTime', label: 'Lead time for change', row: d.leadTimeForChange }, { key: 'ttr', label: 'Time to restore', row: d.timeToRestore },
  ];
  const cols: Column<Row>[] = [
    { key: 'm', header: 'Metric', render: (r) => <strong>{r.label}</strong> },
    { key: 'd', header: 'Derived', align: 'center', render: (r) => (r.row.derived != null ? r.row.derived.toFixed(2) : '—') },
    { key: 'me', header: 'Measured', align: 'center', render: (r) => <input type="number" step={0.1} aria-label={`Measured ${r.label}`} placeholder="measured" className="ac-dora-input" value={r.row.measured ?? ''} onChange={(e) => setDoraMeasured(r.key, e.target.value)} /> },
    { key: 'dl', header: 'Δ', align: 'center', render: (r) => {
      const x = r.row.delta; if (x == null) return '';
      return <span data-ink={Math.abs(x) < 0.05 * Math.abs(r.row.derived || 1) ? 'teal' : 'brick'}>Δ {x > 0 ? '+' : ''}{x.toFixed(2)}</span>;
    } },
    { key: 'u', header: 'Unit', render: (r) => <small className="ac-muted">{r.row.unit}</small> },
  ];
  return (
    <Panel title="DORA read-out" aside={<small className="ac-muted">pulled forward from P5 — pure read-outs of P1/P3 state; valuation stays at P5</small>}>
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.key} />
      <p className="ac-muted">Enter a measured value to compare against the derived read-out — a close match is free evidence the model&apos;s assumptions hold in this environment; a gap is a calibration signal, not a failure.</p>
    </Panel>
  );
}
