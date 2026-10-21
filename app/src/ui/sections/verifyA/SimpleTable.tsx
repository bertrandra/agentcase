import type { CSSProperties, ReactNode } from 'react';

export interface TRow { key: string; cells: ReactNode[]; style?: CSSProperties }
type Align = 'left' | 'center' | 'right';

/** A read-only table whose cells are already formatted; `align` gives the alignment of each column and `foot` an optional total row. */
export function SimpleTable({ head, rows, foot, align = [], empty, caption }: { head: string[]; rows: TRow[]; foot?: TRow; align?: Align[]; empty?: string; caption?: string }) {
  const line = (r: TRow) => <tr key={r.key} style={r.style}>{r.cells.map((c, i) => <td key={i} style={{ textAlign: align[i] ?? 'left' }}>{c}</td>)}</tr>;
  return (
    <div className="ac-table-wrap">
      <table className="ac-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{head.map((h, i) => <th key={h + i} scope="col" style={{ textAlign: align[i] ?? 'left' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map(line) : <tr><td colSpan={head.length} style={{ textAlign: 'center' }} className="ac-muted">{empty ?? 'No data.'}</td></tr>}</tbody>
        {foot && <tfoot>{line({ ...foot, style: { fontWeight: 700, borderTop: '2px solid var(--ac-blue)', ...foot.style } })}</tfoot>}
      </table>
    </div>
  );
}
