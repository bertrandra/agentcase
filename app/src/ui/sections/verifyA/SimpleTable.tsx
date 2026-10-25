import type { ReactNode } from 'react';
import { alignClass, type Align } from '@/ui/widgets/align';

export interface TRow {
  key: string; cells: ReactNode[];
  /** the row's look: a theme class (`is-current`, `is-reg`, `is-total`, … in sections-b.css) */
  className?: string;
  /** cell index -> number of columns the cell spans */
  span?: Record<number, number>;
}

interface Props { head: string[]; rows: TRow[]; foot?: TRow; align?: Align[]; empty?: string; caption?: string }

/**
 * A read-only table whose cells are already formatted; `align` gives the alignment of each column and `foot` an optional total row.
 * A blank head text (a decorative column such as an arrow) stays blank for legacy parity and its cell is presentational: axe's empty-table-header
 * ignores aria-label.
 */
export function SimpleTable({ head, rows, foot, align = [], empty, caption }: Props) {
  const line = (r: TRow) => {
    let col = 0;
    const cell = (c: ReactNode, i: number) => {
      const at = col, span = r.span?.[i] ?? 1;
      col += span;
      return <td key={i} colSpan={span > 1 ? span : undefined} className={alignClass(align[at])}>{c}</td>;
    };
    return <tr key={r.key} className={r.className}>{r.cells.map(cell)}</tr>;
  };
  const th = (h: string, i: number) => <th key={h + i} scope="col" role={h ? undefined : 'presentation'} className={alignClass(align[i])}>{h}</th>;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{head.map(th)}</tr></thead>
        <tbody>{rows.length ? rows.map(line) : <tr><td colSpan={head.length} className="ac-c ac-muted">{empty ?? 'No data.'}</td></tr>}</tbody>
        {foot && <tfoot>{line({ ...foot, className: ['is-total', foot.className].filter(Boolean).join(' ') })}</tfoot>}
      </table>
    </div>
  );
}
