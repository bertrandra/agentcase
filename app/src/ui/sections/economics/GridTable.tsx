import type { ReactNode } from 'react';

export interface GridRow { key: string; label: ReactNode; cells: ReactNode[]; bold?: boolean; rule?: boolean; color?: string }

/** A table whose columns are decided at run time (one per year of the horizon): header labels + rows of already formatted cells. */
export function GridTable({ head, rows, caption }: { head: string[]; rows: GridRow[]; caption?: string }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        {caption && <caption>{caption}</caption>}
        <thead><tr>{head.map((h, i) => <th key={h + i} scope="col" style={{ textAlign: i ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ fontWeight: r.bold ? 700 : undefined, borderTop: r.rule ? '2px solid var(--ac-blue)' : undefined, color: r.color }}>
              <td>{r.label}</td>{r.cells.map((c, i) => <td key={i} style={{ textAlign: 'right' }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
