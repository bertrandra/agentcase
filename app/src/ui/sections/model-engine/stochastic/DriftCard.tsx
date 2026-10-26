import { setCbdDrift, toggleCbd } from '@/controllers/modelStochastic';
import { driftRows, type DriftRow } from '@/domain/model/cbdView';
import { useCtx } from '@/store/hooks';
import { NumField } from '@/ui/widgets/CommitField';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Callout, Panel } from '@/ui/widgets/cards';
import { fmtK } from '../shared';

const cols: Column<DriftRow>[] = [
  { key: 'y', header: 'Year', align: 'center', render: (r) => r.label },
  { key: 'g', header: 'Gross savings', align: 'center', render: (r) => fmtK(r.gross) },
  { key: 'a', header: 'Attributable savings', align: 'center', render: (r) => fmtK(r.attributable) },
  { key: 'w', header: 'Wedge (would have happened anyway)', align: 'center',
    render: (r) => <span className={r.flagged ? 'ac-loss' : 'ac-muted'}>{fmtK(r.wedge)}</span> },
];

/**
 * Counterfactual baseline drift: gross savings (the Time Engine's, one row per horizon year) against the smaller attributable figure once the
 * improvement that would have happened anyway is removed.
 */
export function DriftCard() {
  const c = useCtx(), rows = driftRows(c), on = !!c.s.MODEL.FLAGS.cbd, drift = c.s.MODEL.CBD.driftRate;
  return (
    <Panel title="Counterfactual baseline drift — gross vs. attributable">
      <div className="ac-form-row">
        <button type="button" data-tone={on ? 'danger' : 'primary'} onClick={toggleCbd}>{on ? 'Disable baseline drift' : 'Enable baseline drift'}</button>
        <NumField label="δ — secular drift (/yr)" value={drift} min={0} max={1} step={0.01} width={90} onCommit={setCbdDrift} />
      </div>
      <Callout>{on
        ? <>Phase <strong>ON</strong>. δ={(drift * 100).toFixed(1)}%/yr assumed secular improvement — the wedge below is what gross savings overstate the
          agentic programme&apos;s true attributable benefit.</>
        : <>Phase <strong>OFF</strong> — attributable savings equal gross savings exactly (δ=0 in effect).</>}</Callout>
      <DataTable columns={cols} rows={rows} rowKey={(r) => `y${r.year}`} />
    </Panel>
  );
}
