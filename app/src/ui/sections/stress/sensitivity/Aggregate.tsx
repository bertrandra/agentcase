import { lazy } from 'react';
import type { SensProductRow } from '@/domain/portfolio';
import { useSensitivityRows } from '@/store/selectionHooksStress';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Badge, Callout } from '@/ui/widgets/cards';
import { R, RollupFrame } from '../AggParts';
import { PortfolioTornado } from './PortfolioTornado';

const Detail = lazy(() => import('./index'));
const TONE = { CRITICAL: 'brick', HIGH: 'amber', MEDIUM: 'teal', LOW: 'grey' } as const;
const pct = (v: number | null): string => (v == null ? 'n/a' : `${Math.round(v * 100)}%`);
const param = (r: SensProductRow, name: string): string => r.params.find((p) => p.parameter === name)?.value ?? '';
const VALUES: AggColumn<SensProductRow>[] = ['Automation potential', 'Y3 ramp', 'Glass ceiling', 'Blended day-rate', 'Total setup', 'Token cost']
  .map((name) => ({ key: name, header: name, align: R, render: (r: SensProductRow) => param(r, name) }));
const MOST: AggColumn<SensProductRow>[] = [
  { key: 'most', header: 'Most sensitive parameter', render: (r) => r.most.parameter },
  { key: 'lvl', header: 'Sensitivity', render: (r) => <Badge tone={TONE[r.most.level]}>{r.most.level}</Badge> },
  { key: 'roi', header: 'ROI impact', align: R, render: (r) => r.most.roiImpact }, { key: 'fte', header: 'FTE impact', align: R, render: (r) => r.most.impactFte },
  { key: 'lo', header: 'Matrix ROI, lowest', align: R, render: (r) => pct(r.roiLow) }, { key: 'hi', header: 'Matrix ROI, highest', align: R, render: (r) => pct(r.roiHigh) },
  { key: 'neg', header: 'Negative cells', align: R, render: (r) => `${r.negative} of ${r.cells}` },
];

const NOTE = 'The two tables above are product by product and are not added up (ROI ratios do not add up): the impacts are the editorial ranges of '
  + 'the product view; the matrix span is recomputed for each product’s configuration. The portfolio sensitivity at the top is summed on the calendar.';

/**
 * Sensitivity — Aggregate view: the portfolio tornado of the products in view (domain `portfolioSensitivity`, the consolidation kernel); then the
 * key parameters of each product in view, its most sensitive parameter and the span of its automation × glass-ceiling ROI matrix.
 */
export default function SensitivityAggregate() {
  const rows = useSensitivityRows(), vs = useViewScope();
  return (
    <RollupFrame title="Sensitivity" caption="Key parameters by product" rows={rows} columns={VALUES} Section={Detail}
      notes={
        <>
          <AggregateTable caption={`Most sensitive parameter and ROI span by product — ${vs.label}`} rows={rows} columns={MOST} edit={false} />
          <Callout kind="blue">{NOTE}</Callout>
        </>
      }>
      <PortfolioTornado label={vs.label} />
    </RollupFrame>
  );
}
