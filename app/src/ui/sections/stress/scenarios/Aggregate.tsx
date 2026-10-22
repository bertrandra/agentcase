import { lazy, type ReactNode } from 'react';
import type { ScenarioCell, ScenarioProductRow } from '@/domain/portfolio';
import { fmtPayback, fmtSigned, roiText } from '@/domain/stress';
import { useScenarioRows } from '@/store/selectionHooksStress';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { R, RollupFrame } from '../AggParts';

const Detail = lazy(() => import('./index'));
const KEYS = [['ai', 'AI only'], ['loc', 'Location only'], ['ramp', 'Ramp'], ['ailoc', 'AI + Location'], ['aidst', 'AI + destination']] as const;
const cell = (r: ScenarioProductRow, k: string): ScenarioCell => r.cells.find((c) => c.key === k) as ScenarioCell;
const cols = (f: (c: ScenarioCell) => ReactNode): AggColumn<ScenarioProductRow>[] => [
  { key: 'h', header: 'Horizon', align: R, render: (r) => `${r.horizon} yr` },
  ...KEYS.map(([k, label]) => ({ key: k, header: label, align: R, render: (r: ScenarioProductRow) => f(cell(r, k)) })),
];

/** Scenarios — Aggregate view: the five transformation strategies of every product in view (net, ROI, payback over its own horizon), read-only; no portfolio scenario exists. */
export default function ScenariosAggregate() {
  const rows = useScenarioRows(), vs = useViewScope();
  return (
    <RollupFrame title="Scenario comparison — 6 transformation strategies" caption="Net by scenario (savings minus setup, €)" rows={rows} columns={cols((c) => fmtSigned(c.net))} Section={Detail}
      notes={
        <>
          <AggregateTable caption={`ROI by scenario — ${vs.label}`} rows={rows} columns={cols((c) => roiText(c))} edit={false} />
          <AggregateTable caption={`Payback by scenario — ${vs.label}`} rows={rows} columns={cols((c) => fmtPayback(c.payback, c.horizon * 12))} edit={false} />
          <Callout kind="blue">No portfolio total: each scenario is priced on the product’s own case and horizon, so ROI and payback do not add up and the portfolio has no scenario of its own.
            The consolidated figures of the selection are in Financial. Open a product below for its cost and ROI trajectories.</Callout>
        </>
      } />
  );
}
