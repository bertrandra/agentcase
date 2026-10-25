import type { ReactNode } from 'react';

/** Editing cells shared by the persona and menu-group tables. */

/** The scrollable table of a list: header cells, then the rows. */
export function ListTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
      <thead><tr>{head}</tr></thead>
      <tbody>{children}</tbody>
    </table></div>
  );
}

/** The inline delete confirmation of a row. */
export function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <span className="ac-alert-text ac-small">Delete “{name}”?</span>
      <button type="button" className="ac-btn" onClick={onConfirm}>✓ Confirm</button>
      <button type="button" className="ac-btn" onClick={onCancel}>Cancel</button>
    </>
  );
}

/** The order number of a row (centred, 60 px). */
export function OrderInput({ id, value, onChange }: { id: string; value: number; onChange: (order: number) => void }) {
  return <input type="number" aria-label={`Order of ${id}`} className="ac-order-input" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />;
}

/** The inline rename field: Enter commits, Escape cancels. */
export function RenameInput({ label, value, onChange, onCommit, onCancel }: { label: string; value: string; onChange: (v: string) => void;
  onCommit: () => void; onCancel: () => void }) {
  return <input
    type="text"
    aria-label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}
  />;
}
