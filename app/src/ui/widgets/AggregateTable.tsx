import type { ReactNode } from 'react';
import { showProduct } from '@/controllers/displayScope';
import { useActiveProductId } from '@/store/portfolioHooks';
import { toast } from '../uiState';
import { alignClass } from './align';

export interface AggColumn<R> { key: string; header: string; title?: string; align?: 'left' | 'right'; render: (row: R) => ReactNode }
/** The Wave column most aggregate tables start with. */
export const waveColumn = <R extends { wave: string }>(): AggColumn<R> => ({ key: 'wave', header: 'Wave', render: (r) => r.wave });
/** The total line, already computed by the domain (a headline, a `totals` line): the cells are only formatted here, never added up. Keys: column keys. */
export interface AggTotals { label: string; cells: Record<string, ReactNode> }

/** Make `id` the shown and edited product (one controller, view state: not undoable) and announce it, like the top-bar "Show" does. */
export function editProduct(id: string, name: string): void {
  if (showProduct(id)) toast(`Showing ${name}`);
}

export interface AggregateTableProps<R> {
  caption: string; rows: R[]; columns: AggColumn<R>[]; totals?: AggTotals; first?: string; edit?: boolean; empty?: string;
}

function EditButton({ row }: { row: { id: string; name: string } }) {
  return <button type="button" aria-label={`Edit this product: ${row.name}`} onClick={() => editProduct(row.id, row.name)}>Edit this product</button>;
}

/**
 * The generic table of a aggregate view: one row per product of the selection, columns of values the domain already computed, an optional total line the
 * domain supplied (rule A8: nothing is summed in `ui/`), and, on each row, the button "Edit this product" (sections then become editable for it).
 */
export function AggregateTable<R extends { id: string; name: string }>(props: AggregateTableProps<R>) {
  const { caption, rows, columns, totals, first = 'Product', edit = true, empty = 'No product in the selection.' } = props;
  const active = useActiveProductId();
  if (!rows.length) return <p className="ac-muted">{empty}</p>;
  const align = (c: AggColumn<R>) => alignClass(c.align);
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table ac-cons-table ac-agg-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{first}</th>
            {columns.map((c) => <th key={c.key} scope="col" title={c.title} className={align(c)}>{c.header}</th>)}
            {edit && <th scope="col"><span className="ac-sr">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-row={r.id} className={r.id === active ? 'is-active' : undefined}>
              <th scope="row">{r.name}</th>
              {columns.map((c) => <td key={c.key} className={align(c)}>{c.render(r)}</td>)}
              {edit && <td><EditButton row={r} /></td>}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr data-row="total">
              <th scope="row">{totals.label}</th>
              {columns.map((c) => <td key={c.key} className={align(c)}>{totals.cells[c.key] ?? ''}</td>)}
              {edit && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
