import type { ReactNode } from 'react';

export interface Column<R> { key: string; header: string; render: (row: R, index: number) => ReactNode; align?: 'left' | 'right' | 'center'; title?: string }

/**
 * Typed read-only table. Rows are keyed by `rowKey`; wide tables scroll horizontally (the scroller is keyboard-focusable). A column with no visible
 * header gets a hidden one.
 */
export function DataTable<R>({ columns, rows, rowKey, caption, empty = 'No data.' }: { columns: Column<R>[]; rows: R[]; rowKey: (r: R, i: number) => string; caption?: string; empty?: string }) {
  if (!rows.length) return <p className="ac-muted">{empty}</p>;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" title={c.title} style={{ textAlign: c.align ?? 'left' }}>{c.header || <span className="ac-sr">{c.title ?? 'Item'}</span>}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={rowKey(r, i)}>{columns.map((c) => <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>{c.render(r, i)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
