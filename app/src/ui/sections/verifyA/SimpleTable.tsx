import type { CSSProperties, ReactNode } from 'react';

export interface TRow { key: string; cells: ReactNode[]; style?: CSSProperties; /** cell index -> number of columns the cell spans */ span?: Record<number, number> }
type Align = 'left' | 'center' | 'right';

/**
 * A read-only table whose cells are already formatted; `align` gives the alignment of each column and `foot` an optional total row.
 * A blank head text (a decorative column such as an arrow) stays blank for legacy parity and its cell is presentational: axe's empty-table-header ignores aria-label.
 */
export function SimpleTable({ head, rows, foot, align = [], empty, caption }: { head: string[]; rows: TRow[]; foot?: TRow; align?: Align[]; empty?: string; caption?: string }) {
  const line = (r: TRow) => {
    let col = 0;
    return (
      <tr key={r.key} style={r.style}>
        {r.cells.map((c, i) => { const at = col, span = r.span?.[i] ?? 1; col += span; return <td key={i} colSpan={span > 1 ? span : undefined} style={{ textAlign: align[at] ?? 'left' }}>{c}</td>; })}
      </tr>
    );
  };
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{head.map((h, i) => <th key={h + i} scope="col" role={h ? undefined : 'presentation'} style={{ textAlign: align[i] ?? 'left' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map(line) : <tr><td colSpan={head.length} style={{ textAlign: 'center' }} className="ac-muted">{empty ?? 'No data.'}</td></tr>}</tbody>
        {foot && <tfoot>{line({ ...foot, style: { fontWeight: 700, borderTop: '2px solid var(--ac-blue)', ...foot.style } })}</tfoot>}
      </table>
    </div>
  );
}
