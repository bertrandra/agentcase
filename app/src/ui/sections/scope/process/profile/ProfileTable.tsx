import type { ReactNode } from 'react';

/** A small read-only table of the extended-profile panel: a caption, the column headers, the rows (or a line saying there is none). */
export function ProfileTable({ caption, head, rows, none }: { caption: string; head: string[]; rows: ReactNode[][]; none: string }) {
  if (!rows.length) return <p className="ac-muted">{none}</p>;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <caption>{caption}</caption>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}
