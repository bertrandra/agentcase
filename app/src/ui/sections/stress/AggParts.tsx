import type { ComponentType, ReactNode } from 'react';
import { useProducts } from '@/store/portfolioHooks';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { ProductDrill } from '@/ui/widgets/ProductDrill';
import { SectionFrame } from '@/ui/zones/SectionFrame';

/** Shared parts of the aggregate views of the "stress", "model-engine" and "defend" groups (R-rollup: one line per product, roll-up line from the domain). */

/** Names the products of the View left out of the figures (unscheduled or archived); nothing when none is. */
export function ExcludedNote() {
  const vs = useViewScope(), products = useProducts(), names = vs.excludedIds.map((id) => products.find((p) => p.id === id)?.name ?? id);
  if (!names.length) return null;
  return <Callout kind="warn">Excluded from the figures: {names.join(', ')} (no wave, or archived). Assign a wave to include {names.length > 1 ? 'them' : 'it'}.</Callout>;
}

export interface RollupProps<R extends { id: string; name: string }> {
  title: string;
  help?: ReactNode;
  caption: string;
  rows: R[];
  columns: AggColumn<R>[];
  /** the roll-up line, already formatted from the domain's totals; absent = no portfolio total (say why in `notes`) */
  totals?: Record<string, ReactNode>;
  notes?: ReactNode;
  /** the section (or a detail component) rendered read-only per product under the table */
  Section?: ComponentType | null;
  children?: ReactNode;
  input?: ReactNode;
}

/** The R-rollup aggregate layout: exclusions, optional lead-in, the per-product table with its roll-up line, notes, then the lazy per-product detail. */
export function RollupFrame<R extends { id: string; name: string }>({ title, help, caption, rows, columns, totals, notes, Section, children, input }: RollupProps<R>) {
  const vs = useViewScope();
  return (
    <SectionFrame title={title} help={help} input={input} result={
      <>
        <ExcludedNote />
        {children}
        <AggregateTable caption={`${caption} — ${vs.label}`} rows={rows} columns={columns} edit={false} totals={totals ? { label: `Total — ${vs.label}`, cells: totals } : undefined} />
        {notes}
        {Section && <ProductDrill Section={Section} productIds={vs.productIds} />}
      </>
    } />
  );
}

export const R = 'right' as const;
/** "3 of 5" for a count of products, the form the roll-up lines use. */
export const countOf = (n: number, of: number): string => `${n} of ${of}`;
export const onOff = (on: boolean): string => (on ? 'ON' : 'OFF');
