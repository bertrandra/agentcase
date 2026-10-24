import type { ComponentType } from 'react';
import { aggregateTeams, type InputSummaryRow, type SelectionRow } from '@/domain/portfolio';
import { useCorePortfolio } from '@/store/consolidationHooks';
import { useInputSummary, useSelectionView } from '@/store/selectionHooks';
import { useViewScope } from '@/store/viewScope';
import { fmtEurK, fmtMonths } from '../format';
import { AggregateTable, type AggColumn } from '../widgets/AggregateTable';
import { Callout } from '../widgets/cards';
import { ProductDrill } from '../widgets/ProductDrill';
import { SectionFrame } from './SectionFrame';
import type { SectionKind } from './sectionScope';

/** What a generic aggregate view receives: the section (id, title) and its product-view component, which the drill-down renders for each product. */
export interface FallbackProps { id: string; title: string; Section: ComponentType | null }

const R = 'right' as const;
const ROLLUP: AggColumn<SelectionRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'setup', header: 'Setup', align: R, title: 'Setup investment of the product, on the calendar axis', render: (r) => fmtEurK(r.setup) },
  { key: 'savings', header: 'Savings', align: R, title: 'Cumulative savings over the calendar horizon', render: (r) => fmtEurK(r.savings) },
  { key: 'net', header: 'Net', align: R, render: (r) => fmtEurK(r.net) },
  { key: 'npv', header: 'Calendar NPV', align: R, title: 'Discounted from month 1 of the portfolio: the sum of the lines is the NPV of the selection', render: (r) => fmtEurK(r.npv) },
  { key: 'payback', header: 'Payback', align: R, render: (r) => fmtMonths(r.paybackMonth) },
];

/** R-rollup without its own aggregate: the key figures of each product of the selection (domain lines and total), then the section itself per product. */
export function RollupFallback({ title, Section }: FallbackProps) {
  const v = useSelectionView(), vs = useViewScope();
  if (!v) return null;
  const t = v.totals;
  return (
    <SectionFrame title={title} result={
      <>
        <AggregateTable caption={`Key figures by product — ${v.label}`} rows={v.rows} columns={ROLLUP} edit={false}
          totals={{ label: `Total — ${v.label}`, cells: { setup: fmtEurK(t.setup), savings: fmtEurK(t.savings), net: fmtEurK(t.net), npv: fmtEurK(t.npv), payback: fmtMonths(t.paybackMonth) } }} />
        <Callout kind="blue">This section checks or details each product separately: the figures do not add up. Open a product below to see the section as it computes it.</Callout>
        {Section && <ProductDrill Section={Section} productIds={vs.productIds} />}
      </>
    } />
  );
}

const INPUTS: AggColumn<InputSummaryRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'etp', header: 'Entry FTE', align: R, title: 'Entry team of the product', render: (r) => r.etp.toFixed(1) },
  { key: 'art', header: 'SDLC artefacts', align: R, render: (r) => r.artefacts },
  { key: 'reg', header: 'Regulatory artefacts', align: R, render: (r) => r.regArtefacts },
  { key: 'ovr', header: 'Overrides', align: R, title: 'Product-specific values (0 = everything is inherited)', render: (r) => r.overrides },
  { key: 'hub', header: 'Knowledge Hub', render: (r) => r.hub },
];

/** I-input without its own aggregate: what each product of the selection holds (team, scope, overrides, hub) and the button to edit it. */
export function InputFallback({ title }: FallbackProps) {
  const rows = useInputSummary(), core = useCorePortfolio(), vs = useViewScope();
  const etp = aggregateTeams(core, vs.productIds).total;
  return (
    <SectionFrame title={title} input={
      <>
        <Callout kind="blue">Summary, read-only: the inputs of this section belong to each product. Edit them in place below (the choice of “Edit” in the top bar), or “Edit this product” to view that product.</Callout>
        <AggregateTable caption={`Inputs by product — ${vs.label}`} rows={rows} columns={INPUTS}
          totals={{ label: `Total — ${vs.label}`, cells: { etp: etp.toFixed(1) } }} />
      </>
    } />
  );
}

/** R-conso that has no consolidated form yet (TODO tracked in docs/VUE_AGREGEE.md): the section per product, plus an explicit note. */
export function ConsoFallback({ title, Section }: FallbackProps) {
  const vs = useViewScope();
  return (
    <SectionFrame title={title} result={
      <>
        <Callout kind="blue">Consolidated view coming for this section: the detail by product of the selection ({vs.label}) is below. No figure is added up here.</Callout>
        {Section && <ProductDrill Section={Section} productIds={vs.productIds} />}
      </>
    } />
  );
}

/** The generic fallback of each kind that follows the View (the other kinds render the section as it is). */
export const FALLBACKS: Partial<Record<SectionKind, ComponentType<FallbackProps>>> = { 'R-rollup': RollupFallback, 'I-input': InputFallback, 'R-conso': ConsoFallback };
