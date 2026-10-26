import type { EvidenceRow } from '@/domain/portfolio';
import { useEvalDate } from '@/ui/evalDate';
import { EVL_STAGE_LABEL, evlModel } from '@/domain/model/evidence';
import { useCtx } from '@/store/hooks';
import { useEvidenceRows } from '@/store/selectionHooksModelEngine';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { countOf, phaseColumn, R, RollupFrame } from '../../stress/AggParts';
import { DriverTable } from './DriverTable';
import { Grade } from './Grade';

const COLS: AggColumn<EvidenceRow>[] = [
  phaseColumn('P6'), { key: 'stage', header: 'Stage', render: (r) => EVL_STAGE_LABEL[r.stage] ?? r.stage },
  { key: 'grade', header: 'Confidence grade', render: (r) => r.grade ?? 'n/a' },
  { key: 'score', header: 'Score', align: R, render: (r) => (r.score === null ? 'n/a' : `${(r.score * 100).toFixed(0)}%`) },
  { key: 'meets', header: 'Meets the stage', render: (r) => (r.meets === null ? 'n/a' : r.meets ? 'yes' : 'no') },
  { key: 'm', header: 'Measured drivers', align: R, render: (r) => r.measured },
  { key: 'b', header: 'Benchmark drivers', align: R, render: (r) => r.benchmark }, { key: 'a', header: 'Assumed drivers', align: R, render: (r) => r.assumed },
];

/**
 * Per-product detail with the equal-weight grade (the tornado weights come from the P4 run of the edited product, so they are not applied to another
 * product).
 */
function EvidenceDetail() {
  const em = evlModel(useCtx(), null, useEvalDate());
  return <SectionFrame title="Evidence ledger of the product" result={<><Grade em={em} /><DriverTable em={em} /></>} />;
}

/**
 * Evidence ledger (P6) — Aggregate view: confidence grade and evidence tiers of the seven drivers of each product in view; the roll-up counts tiers
 * and gives the worst grade.
 */
export default function EvidenceAggregate() {
  const { rows, on, measured, benchmark, assumed, worst } = useEvidenceRows(useEvalDate());
  return (
    <RollupFrame title="📋 Evidence ledger · P6 · v16.10 · cross-cutting" caption="Evidence by product" rows={rows} columns={COLS} Section={EvidenceDetail}
      totals={{ on: `${countOf(on, rows.length)} on`, grade: worst ? `worst: ${worst}` : 'n/a', m: measured, b: benchmark, a: assumed }}
      notes={<Callout kind="blue">Grades are computed with equal driver weights (influence weights come from the P4 run of the edited product); a grade is never
        averaged, the roll-up shows the worst. Choose “Edit this product” to run P4 and re-weight.</Callout>} />
  );
}
