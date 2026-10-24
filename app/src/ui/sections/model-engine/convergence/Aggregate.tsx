import { lazy } from 'react';
import type { ConvergenceRow } from '@/domain/portfolio';
import { useConvergenceRows } from '@/store/selectionHooksModelEngine';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { countOf, phaseColumn, R, RollupFrame } from '../../stress/AggParts';

const Detail = lazy(() => import('./index'));
const COLS: AggColumn<ConvergenceRow>[] = [
  phaseColumn('P1'), { key: 'cal', header: 'Calibration', render: (r) => (r.calibrated ? 'calibrated' : 'uncalibrated') },
  { key: 'loops', header: 'Loop pairs', align: R, render: (r) => r.loops }, { key: 'en', header: 'Weighted E[N]', align: R, render: (r) => r.weightedEN.toFixed(2) },
  { key: 'esc', header: 'Escape rate', align: R, render: (r) => `${r.escapePct.toFixed(1)}%` }, { key: 'rev', header: 'Review share', align: R, render: (r) => `${(r.reviewShare * 100).toFixed(0)}%` },
  { key: 'above', header: 'Loops above 5% escape', align: R, title: 'Loops whose escape rate exceeds 5%: they need a costed fallback (CC-LC-03)', render: (r) => r.above },
  { key: 'pass', header: 'CC-LC checks passed', align: R, render: (r) => r.checksPass }, { key: 'fail', header: 'CC-LC checks failed', align: R, render: (r) => r.checksFail },
];

/** Loop convergence (P1) — Aggregate view: expected attempts, escape rate and the CC-LC checks of each product in view; the roll-up counts phases on, loops at risk and failing checks. */
export default function ConvergenceAggregate() {
  const { rows, on, above, checksFail } = useConvergenceRows();
  return (
    <RollupFrame title="🔁 Loop convergence economics · P1 · v16.5" caption="Loop convergence by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ on: `${countOf(on, rows.length)} on`, above, fail: checksFail }}
      notes={<Callout kind="blue">E[N], escape rate and review share are per product (ratios): they are not added up. The roll-up line counts the products with the phase on, the loops above the 5% escape limit and the failing CC-LC checks.</Callout>} />
  );
}
