import { lazy, type ReactNode } from 'react';
import type { ScenarioCell, ScenarioProductRow } from '@/domain/portfolio';
import { fmtPayback, fmtSigned, roiText } from '@/domain/stress';
import { usePortfolioScenarios, useScenarioRows } from '@/store/selectionHooksStress';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { R, RollupFrame } from '../AggParts';
import { PortfolioScenarios } from './PortfolioTables';

const Detail = lazy(() => import('./index'));
const KEYS = [['ai', 'AI only'], ['loc', 'Location only'], ['ramp', 'Ramp'], ['ailoc', 'AI + Location'], ['aidst', 'AI + destination']] as const;
const cell = (r: ScenarioProductRow, k: string): ScenarioCell => r.cells.find((c) => c.key === k) as ScenarioCell;
const cols = (f: (c: ScenarioCell) => ReactNode): AggColumn<ScenarioProductRow>[] => [
  { key: 'h', header: 'Horizon', align: R, render: (r) => `${r.horizon} yr` },
  ...KEYS.map(([k, label]) => ({ key: k, header: label, align: R, render: (r: ScenarioProductRow) => f(cell(r, k)) })),
];

/**
 * Scenarios — Aggregate view: the six scenarios summed over the products in view on the portfolio calendar (domain `portfolioScenarios`, the
 * consolidation kernel), with the per-product breakdown; then each product's scenarios over its own horizon, read-only.
 */
export default function ScenariosAggregate() {
  const rows = useScenarioRows(), pf = usePortfolioScenarios(), vs = useViewScope();
  return (
    <RollupFrame title="Scenario comparison — 6 transformation strategies" caption="Net by scenario over each product’s own horizon (savings minus setup, €)"
      rows={rows} columns={cols((c) => fmtSigned(c.net))} Section={Detail}
      notes={
        <>
          <AggregateTable caption={`ROI by scenario — ${vs.label}`} rows={rows} columns={cols((c) => roiText(c))} edit={false} />
          <AggregateTable caption={`Payback by scenario — ${vs.label}`} rows={rows} columns={cols((c) => fmtPayback(c.payback, c.horizon * 12))} edit={false} />
          <Callout kind="blue">The three tables above price each product on its own case from its own month 0, over its own horizon: they are not added up. The
            portfolio scenarios at the top place them on the calendar. Open a product below for its cost and ROI trajectories.</Callout>
        </>
      }>
      <PortfolioScenarios data={pf} label={vs.label} />
    </RollupFrame>
  );
}
