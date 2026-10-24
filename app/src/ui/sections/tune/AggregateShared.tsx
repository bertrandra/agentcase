import type { ComponentType, ReactNode } from 'react';
import type { TuneSpread as Spread } from '@/domain/portfolio';
import { useProducts } from '@/store/portfolioHooks';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { ProductDrill } from '@/ui/widgets/ProductDrill';
import { SectionFrame } from '@/ui/zones/SectionFrame';

/** The products of the View that the figures leave out (no wave, or archived), named; nothing when all are planned. */
export function ExcludedNote() {
  const vs = useViewScope(), products = useProducts();
  if (!vs.excludedIds.length) return null;
  const names = vs.excludedIds.map((id) => { const p = products.find((x) => x.id === id); return p ? `${p.name}${p.archived ? ' (archived)' : ''}` : id; });
  return <Callout kind="blue">Excluded from the figures (no wave, or archived): {names.join(', ')}.</Callout>;
}

/** Aggregate view of an INPUT section: read-only synthesis (explanation, exclusions, then the tables). */
export function InputAggregate({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <SectionFrame title={title} input={
      <>
        <Callout kind="blue">Summary, read-only: {intro} Edit it in place below (the choice of “Edit” in the top bar), or “Edit this product” to view that product.</Callout>
        <ExcludedNote />
        {children}
      </>
    } />
  );
}

/** Aggregate view of a RESULT section that does not add up: the roll-up tables, a note, then the section itself per product (read-only drill-down). */
export function RollupAggregate({ title, note, Section, children }: { title: string; note: string; Section: ComponentType; children: ReactNode }) {
  const vs = useViewScope();
  return (
    <SectionFrame title={title} result={
      <>
        <ExcludedNote />
        {children}
        <Callout kind="blue">{note}</Callout>
        <ProductDrill Section={Section} productIds={vs.productIds} />
      </>
    } />
  );
}

/** A figure of the selection with its spread: label, formatter, spread (min / max / average over the products, computed by the domain). */
export interface SpreadItem { id: string; name: string; s: Spread; f: (v: number) => string }
const SPREAD: AggColumn<SpreadItem>[] = [
  { key: 'min', header: 'Min', align: 'right', render: (r) => r.f(r.s.min) },
  { key: 'avg', header: 'Average', align: 'right', title: 'Plain mean over the products of the selection', render: (r) => r.f(r.s.avg) },
  { key: 'max', header: 'Max', align: 'right', render: (r) => r.f(r.s.max) },
  { key: 'n', header: 'Products', align: 'right', render: (r) => r.s.n },
];
/** Min / max / average of the key figures over the selection. */
export function SpreadTable({ caption, items }: { caption: string; items: SpreadItem[] }) {
  return <AggregateTable caption={caption} first="Figure" rows={items} columns={SPREAD} edit={false} />;
}
