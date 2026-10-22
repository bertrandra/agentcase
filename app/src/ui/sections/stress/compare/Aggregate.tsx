import { lazy } from 'react';
import type { CompareProductRow } from '@/domain/portfolio';
import { fmtK } from '@/domain/stress';
import { useCompareRows } from '@/store/selectionHooksStress';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { R, RollupFrame } from '../AggParts';

const Detail = lazy(() => import('./index'));
const fte = (v: number): string => v.toFixed(1);
const COLS: AggColumn<CompareProductRow>[] = [
  { key: 'h', header: 'Horizon', align: R, render: (r) => `${r.horizon} yr` },
  { key: 'cs', header: 'Classic saving', align: R, title: 'Annual saving rate of the optimised AS-IS trajectory (an input of the product)', render: (r) => `${r.classicSaving}%/yr` },
  { key: 'af', header: 'FTE AS-IS', align: R, render: (r) => fte(r.asisFte) }, { key: 'cf', header: 'FTE AS-IS + saving', align: R, render: (r) => fte(r.classicFte) },
  { key: 'gf', header: 'FTE Agentic', align: R, render: (r) => fte(r.agenticFte) }, { key: 'vf', header: 'Agent vFTE', align: R, render: (r) => fte(r.vfte) },
  { key: 'ac', header: 'Cost AS-IS', align: R, render: (r) => fmtK(r.asisCost) }, { key: 'cc', header: 'Cost AS-IS + saving', align: R, render: (r) => fmtK(r.classicCost) },
  { key: 'gc', header: 'Run cost Agentic', align: R, render: (r) => fmtK(r.agenticCost) },
  { key: 'cs2', header: 'Cum. saving AS-IS + saving', align: R, render: (r) => fmtK(r.classicSave) }, { key: 'gs', header: 'Cum. saving Agentic', align: R, render: (r) => fmtK(r.agenticSave) },
];

/** 3-way Comparison — Aggregate view: AS-IS / AS-IS + saving / Agentic at the end of each product’s horizon, with the roll-up line of the selection. */
export default function CompareAggregate() {
  const { rows, totals: t } = useCompareRows();
  return (
    <RollupFrame title="3-way Comparison — AS-IS / AS-IS + saving / Agentic" caption="Final-year key figures by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ af: fte(t.asisFte), cf: fte(t.classicFte), gf: fte(t.agenticFte), vf: fte(t.vfte), ac: fmtK(t.asisCost), cc: fmtK(t.classicCost), gc: fmtK(t.agenticCost), cs2: fmtK(t.classicSave), gs: fmtK(t.agenticSave) }}
      notes={<Callout kind="blue">The roll-up line adds the end-of-horizon figures of the products in view (headcount, annual cost, cumulative saving): each product is read at the end of its own horizon.
        The classic saving rate is an input of each product and is not averaged. Open a product below for its trajectories.</Callout>} />
  );
}
