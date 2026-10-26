import { lazy } from 'react';
import type { VerificationRow } from '@/domain/portfolio';
import { useVerificationRows } from '@/store/selectionHooksModelEngine';
import { Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { countOf, phaseColumn, R, RollupFrame } from '../../stress/AggParts';
import { pct1 } from '../shared';

const Detail = lazy(() => import('./index'));
const COLS: AggColumn<VerificationRow>[] = [
  phaseColumn('P2'), { key: 'mode', header: 'Tax mode', render: (r) => (r.net ? 'Net' : 'Overlay') },
  { key: 'classes', header: 'Criticality classes', align: R, render: (r) => r.classes },
  { key: 'phi', header: 'φ (weighted floor)', align: R, render: (r) => pct1(r.phi) },
  { key: 'rate', header: 'Verification-tax rate', align: R, render: (r) => pct1(r.rate) },
  { key: 'rho', header: 'ρmax (ROI ceiling)', align: R, render: (r) => pct1(r.rhoMax) },
];

/**
 * Verification tax (P2) — Aggregate view: derived tax rate, floor and structural ROI ceiling ρmax of each product in view; the roll-up counts phases
 * on and gives the lowest ceiling.
 */
export default function VerificationAggregate() {
  const { rows, on, lowestRhoMax } = useVerificationRows();
  return (
    <RollupFrame title="🛡️ Verification tax · P2 · v16.6" caption="Verification tax by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ on: `${countOf(on, rows.length)} on`, rho: lowestRhoMax === null ? 'n/a' : `lowest ${pct1(lowestRhoMax)}` }}
      notes={<Callout kind="blue">Rates and ceilings are ratios per product: they are not added up. The roll-up shows how many products run the derived tax and
        the lowest structural ceiling of the selection.</Callout>} />
  );
}
