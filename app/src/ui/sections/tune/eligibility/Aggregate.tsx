import type { EligibilityRow } from '@/domain/portfolio';
import { useEligibilityAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { RollupAggregate } from '../AggregateShared';
import EligibilitySection from './index';

const R = 'right' as const;
const GATE: Record<EligibilityRow['verdict'], string> = { go: 'GO — eligible', conditional: 'CONDITIONAL — close the gaps', 'no-go': 'NO-GO — blocked' };
const COLS: AggColumn<EligibilityRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'verdict', header: 'Gate', render: (r) => GATE[r.verdict] },
  { key: 'met', header: 'Prerequisites met (of 6)', align: R, render: (r) => r.met },
  { key: 'crit', header: 'Critical unmet', align: R, render: (r) => r.unmetCrit },
  { key: 'partial', header: 'Partial / non-critical', align: R, render: (r) => r.partial },
  { key: 'loc', header: 'Codebase (k LoC)', align: R, render: (r) => r.loc },
  { key: 'nature', header: 'Nature', render: (r) => r.nature },
  { key: 'profile', header: 'Pillar profile', render: (r) => r.profile },
  { key: 'level', header: 'Maturity level', align: R, render: (r) => `L${r.level}` },
  { key: 'tax', header: 'Verification tax', align: R, render: (r) => `${(r.vTaxRate * 100).toFixed(1)}%` },
];

/**
 * Eligibility & Abaques — Aggregate view: the go / conditional / no-go gate of each
 * product with its prerequisites, profile and verification tax, and the verdict count.
 */
export default function EligibilityAggregate() {
  const a = useEligibilityAgg(), vs = useViewScope(), t = a.totals;
  return (
    <RollupAggregate title="🎯 Eligibility & Abaques" Section={EligibilitySection}
      note="The gate is a control per product and does not add up: the total line counts the verdicts. Open a product below for its gate, pillar matrix and Abaque reconciliation.">
      <AggregateTable caption={`Eligibility gate by product — ${vs.label}`} rows={a.rows} columns={COLS} edit={false}
        totals={{ label: `Verdicts — ${vs.label}`, cells: { verdict: `${t.go} go · ${t.conditional} conditional · ${t.noGo} blocked` } }} />
    </RollupAggregate>
  );
}
