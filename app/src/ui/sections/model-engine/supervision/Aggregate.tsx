import { lazy } from 'react';
import type { SupervisionRow } from '@/domain/portfolio';
import { useSupervisionRows } from '@/store/selectionHooksModelEngine';
import { fmtEurK } from '@/ui/format';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { countOf, phaseColumn, R, RollupFrame } from '../../stress/AggParts';

const Detail = lazy(() => import('./index'));
const fte = (v: number): string => v.toFixed(1);
const COLS: AggColumn<SupervisionRow>[] = [
  phaseColumn('P3'), { key: 'mode', header: 'Mode', render: (r) => (r.constrained ? 'Constrained' : 'Provisioned') },
  { key: 'sup', header: 'Supervisors (FTE)', align: R, render: (r) => fte(r.supervisors) },
  { key: 'need', header: 'Supervisors needed at horizon end (FTE)', align: R, render: (r) => fte(r.needed) },
  { key: 'cost', header: 'Supervision run cost at horizon end', align: R, render: (r) => fmtEurK(r.runCost) },
  { key: 'vfte', header: 'Agent vFTE at horizon end', align: R, render: (r) => fte(r.vfte) },
  { key: 'unlock', header: 'To unlock', align: R, title: 'Supervisors to add so that the constrained case matches the unconstrained one',
    render: (r) => r.toUnlock },
];

/** Supervision (P3) — Aggregate view: mode, supervisor capacity needed, run cost and agent vFTE of each product in view, with the domain’s roll-up line. */
export default function SupervisionAggregate() {
  const { rows, totals: t } = useSupervisionRows();
  return (
    <RollupFrame title="🧑‍✈️ Supervision — provisioned or constrained · P3 · v16.7" caption="Supervision by product" rows={rows} columns={COLS}
      Section={Detail}
      totals={{ on: `${countOf(t.on, rows.length)} on`, mode: `${t.constrained} constrained`, sup: fte(t.supervisors), need: fte(t.needed),
        cost: fmtEurK(t.runCost), vfte: fte(t.vfte), unlock: t.toUnlock }}
      notes={<Callout kind="blue">Supervisor headcount, run cost and agent vFTE add up across the products of the selection (the roll-up line); the mode is per
        product. Open a product below for its capacity table and DORA read-out.</Callout>} />
  );
}
