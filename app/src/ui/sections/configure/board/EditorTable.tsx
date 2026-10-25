import type { ReactNode } from 'react';

/** The editing table of a dashboard's cards or body rows: heading with the count, hint, table (empty line when there is nothing), and the Add button. */
export function EditorTable({ title, count, hint, caption, head, cols, empty, add, onAdd, children }: {
  title: string; count: number; hint: string; caption: string; head: ReactNode; cols: number; empty: string; add: string; onAdd: () => void;
    children: ReactNode;
}) {
  return (
    <>
      <h4>{title} <span className="ac-muted">— {count}</span></h4>
      <p className="ac-muted">{hint}</p>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{head}<th scope="col"><span className="ac-sr">Actions</span></th></tr></thead>
        <tbody>
          {count === 0 && <tr><td colSpan={cols} className="ac-muted">{empty}</td></tr>}
          {children}
        </tbody>
      </table></div>
      <button type="button" className="ac-btn" onClick={onAdd}>{add}</button>
    </>
  );
}

/** The last cell of an editing row: its remove button. */
export const RemoveCell = ({ name, onRemove }: { name: string; onRemove: () => void }) => (
  <td><button type="button" className="ac-btn" aria-label={`Remove ${name}`} onClick={onRemove}>✕</button></td>
);
