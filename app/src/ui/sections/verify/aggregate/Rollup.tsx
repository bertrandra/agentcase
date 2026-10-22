import type { ComponentType, ReactNode } from 'react';
import type { VRow, VTable } from '@/domain/portfolio';
import { useProducts } from '@/store/portfolioHooks';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { ProductDrill } from '@/ui/widgets/ProductDrill';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { fmtCell } from './fmtCell';

/** The products the View leaves out of the figures (no wave, or archived), named; nothing when all are in. */
export function ExcludedNote() {
  const vs = useViewScope(), products = useProducts();
  const left = vs.excludedIds.flatMap((id) => { const p = products.find((x) => x.id === id); return p ? [`${p.name}${p.archived ? ' (archived)' : ''}`] : []; });
  return left.length ? <Callout kind="blue">Excluded from the figures (no wave, or archived): {left.join(', ')}.</Callout> : null;
}

/** A VTable of the domain as the aggregate table: a Wave column, the domain's columns and the selection line as the domain computed it (never summed here). */
export function VerifyTable({ table, caption, totalLabel = 'Total', first, edit = false }: { table: VTable; caption: string; totalLabel?: string; first?: string; edit?: boolean }) {
  const vs = useViewScope();
  const columns: AggColumn<VRow>[] = [{ key: 'wave', header: 'Wave', render: (r) => r.wave },
    ...table.columns.map((c) => ({ key: c.key, header: c.header, title: c.title, align: c.kind === 'text' ? ('left' as const) : ('right' as const), render: (r: VRow) => fmtCell(r.cells[c.key], c.kind) }))];
  const cells = Object.fromEntries(table.columns.map((c) => [c.key, fmtCell(table.total[c.key], c.kind)]));
  return <AggregateTable caption={`${caption} — ${vs.label}`} rows={table.rows} columns={columns} first={first} edit={edit} totals={{ label: `${totalLabel} — ${vs.label}`, cells }} />;
}

/**
 * Aggregate view of a R-rollup section of the verify group: the section's own figures per product with the selection line from the domain, then the
 * section itself per product (read-only drill-down, `ProductViewContext`).
 */
export function RollupFrame({ title, help, caption, totalLabel, table, Section, note }:
  { title: string; help?: ReactNode; caption: string; totalLabel?: string; table: VTable | null; Section: ComponentType; note: string }) {
  const vs = useViewScope();
  if (!table) return null;
  return (
    <SectionFrame title={title} help={help} result={
      <>
        <p className="ac-muted">{note}</p>
        <VerifyTable table={table} caption={caption} totalLabel={totalLabel} />
        <ExcludedNote />
        <ProductDrill Section={Section} productIds={vs.productIds} />
      </>
    } />
  );
}
