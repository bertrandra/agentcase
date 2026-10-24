import { lazy } from 'react';
import { complianceTable } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { RollupFrame } from '../aggregate/Rollup';

const Section = lazy(() => import('./index'));

/**
 * Regulatory compliance — aggregate view (R-rollup): sector, glass ceiling and
 * regulatory artifacts of each product; the line is the entry-team weighted ceiling.
 */
export default function ComplianceAggregate() {
  return <RollupFrame title="Regulatory compliance" caption="Compliance coverage by product" totalLabel="Weighted by entry team" Section={Section}
    table={useVerifyView(complianceTable)}
    note="Sector, glass ceiling, maximum automatable share and regulatory artifacts of each product. The selection line weights the ceiling by the entry team of each product and counts the regulatory artifacts." />;
}
