import type { ReactNode } from 'react';
import { showProduct } from '@/controllers/displayScope';
import { useActiveProductId } from '@/store/portfolioHooks';
import { toast } from '../uiState';

export interface AggColumn<R> { key: string; header: string; title?: string; align?: 'left' | 'right'; render: (row: R) => ReactNode }
/** The total line, already computed by the domain (a headline, a `totals` line): the cells are only formatted here, never added up. Keys are column keys. */
export interface AggTotals { label: string; cells: Record<string, ReactNode> }

/** Make `id` the edited product and the Vue (one controller, view state: not undoable) and announce it, like the Vue selector does. */
export function editProduct(id: string, name: string): void {
  if (showProduct(id)) toast(`Vue : produit ${name} (édité)`);
}

/**
 * The generic table of a Vue agrégée: one row per product of the selection, columns of values the domain already computed, an optional total line the
 * domain supplied (rule A8: nothing is summed in `ui/`), and, on each row, the button "Éditer ce produit" (sections then become editable for it).
 */
export function AggregateTable<R extends { id: string; name: string }>({ caption, rows, columns, totals, first = 'Produit', edit = true, empty = 'Aucun produit dans la sélection.' }:
  { caption: string; rows: R[]; columns: AggColumn<R>[]; totals?: AggTotals; first?: string; edit?: boolean; empty?: string }) {
  const active = useActiveProductId();
  if (!rows.length) return <p className="ac-muted">{empty}</p>;
  const align = (c: AggColumn<R>) => ({ textAlign: c.align ?? 'left' }) as const;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table ac-cons-table ac-agg-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{first}</th>
            {columns.map((c) => <th key={c.key} scope="col" title={c.title} style={align(c)}>{c.header}</th>)}
            {edit && <th scope="col"><span className="ac-sr">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-row={r.id} className={r.id === active ? 'is-active' : undefined}>
              <th scope="row">{r.name}</th>
              {columns.map((c) => <td key={c.key} style={align(c)}>{c.render(r)}</td>)}
              {edit && <td><button type="button" aria-label={`Éditer ce produit : ${r.name}`} onClick={() => editProduct(r.id, r.name)}>Éditer ce produit</button></td>}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr data-row="total">
              <th scope="row">{totals.label}</th>
              {columns.map((c) => <td key={c.key} style={align(c)}>{totals.cells[c.key] ?? ''}</td>)}
              {edit && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
