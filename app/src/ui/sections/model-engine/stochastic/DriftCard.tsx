import { setCbdDrift, toggleCbd } from '@/controllers/modelStochastic';
import { model } from '@/domain/model/overlay';
import { useCtx } from '@/store/hooks';
import { NumField } from '@/ui/widgets/CommitField';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Callout, Panel } from '@/ui/widgets/cards';
import { fmtK } from '../shared';

/** Counterfactual baseline drift: gross savings against the smaller attributable figure once the improvement that would have happened anyway is removed. */
export function DriftCard() {
  const c = useCtx(), m = model(c), on = !!c.s.MODEL.FLAGS.cbd, drift = c.s.MODEL.CBD.driftRate;
  const cols: Column<number>[] = [
    { key: 'y', header: 'Year', align: 'center', render: (i) => `Y${i + 1}` },
    { key: 'g', header: 'Gross savings', align: 'center', render: (i) => fmtK(m.yearSav[i] as number) },
    { key: 'a', header: 'Attributable savings', align: 'center', render: (i) => fmtK(m.cbd.yearSavAttributable[i] as number) },
    { key: 'w', header: 'Wedge (would have happened anyway)', align: 'center',
      render: (i) => <span className={(m.cbd.wedge[i] as number) > 1 ? 'ac-loss' : 'ac-muted'}>{fmtK(m.cbd.wedge[i] as number)}</span> },
  ];
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
      <DataTable columns={cols} rows={[0, 1, 2]} rowKey={(i) => `y${i}`} />
    </Panel>
  );
}
