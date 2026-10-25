import type { ReactNode } from 'react';

export interface GridRow { key: string; label: ReactNode; cells: ReactNode[]; bold?: boolean; rule?: boolean }

/** A table whose columns are decided at run time (one per year of the horizon): header labels + rows of already formatted cells. */
export function GridTable({ head, rows, caption }: { head: string[]; rows: GridRow[]; caption?: string }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{head.map((h, i) => <th key={h + i} scope="col" className={i ? 'ac-num' : undefined}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={[r.bold && 'is-bold', r.rule && 'is-rule'].filter(Boolean).join(' ') || undefined}>
              <td>{r.label}</td>{r.cells.map((c, i) => <td key={i} className="ac-num">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
