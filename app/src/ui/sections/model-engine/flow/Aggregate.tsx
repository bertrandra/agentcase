import { lazy } from 'react';
import type { FlowRow } from '@/domain/portfolio';
import { useFlowRows } from '@/store/selectionHooksModelEngine';
import { fmtEurK } from '@/ui/format';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { countOf, onOff, R, RollupFrame } from '../../stress/AggParts';

const Detail = lazy(() => import('./index'));
const days = (v: number): string => `${v.toFixed(1)} d`;
const COLS: AggColumn<FlowRow>[] = [
  { key: 'on', header: 'Phase P5', render: (r) => onOff(r.on) }, { key: 'asis', header: 'Cycle time AS-IS', align: R, render: (r) => days(r.ctAsis) },
  { key: 'new', header: 'Cycle time with agents', align: R, render: (r) => days(r.ctNew) }, { key: 'theta', header: 'Compression θ', align: R, render: (r) => `${(r.theta * 100).toFixed(0)}%` },
  { key: 'wip', header: 'WIP (Little)', align: R, render: (r) => r.wip.toFixed(1) },
  { key: 'npv', header: 'Time-to-market value (NPV)', align: R, title: 'Hidden until the sponsor gives a margin per month', render: (r) => (r.flowNpv === null ? 'no margin given' : fmtEurK(r.flowNpv)) },
];

/** Flow & value (P5) — Aggregate view: cycle time, compression, WIP and time-to-market value of each product in view; WIP and value add up, cycle times do not. */
export default function FlowAggregate() {
  const { rows, on, wip, flowNpv, valued } = useFlowRows();
  return (
    <RollupFrame title="⏱️ Flow & value · P5 · v16.9 · strategic bet" caption="Flow and value by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ on: `${countOf(on, rows.length)} on`, wip: wip.toFixed(1), npv: valued ? `${fmtEurK(flowNpv)} (${countOf(valued, rows.length)} valued)` : 'no margin given' }}
      notes={<Callout kind="blue">The roll-up adds the work in progress and the sponsor-owned value of the products that have a margin; cycle times and compression are per product and are not averaged. Nothing here feeds the financial model.</Callout>} />
  );
}
