import type { ReactNode } from 'react';
import { addRecord, removeRecord, setField } from '@/controllers/factory';
import type { Coll } from '@/domain/factory/collections';
import { ConfirmButton } from '@/ui/widgets/CommitField';
import { LazySelect, type Opt } from '@/ui/widgets/LazySelect';

export type Rec = { id: string; [k: string]: unknown };
/** A column: a text field, a choice among fixed values or among linked records, plain text, or anything (`custom`). */
export type Col =
  | { kind: 'text'; header: string; field: string; placeholder?: string }
  | { kind: 'choice'; header: string; field: string; options: string[]; tone?: Record<string, string> }
  | { kind: 'link'; header: string; field: string; options: Opt[]; emptyLabel?: string }
  | { kind: 'static'; header: string; text: (r: Rec) => string }
  | { kind: 'custom'; header: string; render: (r: Rec) => ReactNode };

/** Editable table of one factory collection: header always shown, "No … yet." when empty, orphan-on-delete through the controller (armed delete). */
export function RecordTable({ coll, rows, cols, noun, empty, addLabel, label, cap, canDelete = true }: {
  coll: Coll; rows: Rec[]; cols: Col[]; noun: string; empty: string; addLabel: string; label: (r: Rec) => string; cap?: number; canDelete?: boolean;
}) {
  const shown = cap && rows.length > cap ? rows.slice(0, cap) : rows;
  const cell = (c: Col, r: Rec) => {
    const aria = `${c.header} of ${label(r)}`;
    if (c.kind === 'text') return <input type="text" aria-label={aria} placeholder={c.placeholder} style={{ width: '100%' }} value={String(r[c.field] ?? '')} onChange={(e) => setField(coll, r.id, c.field, e.target.value)} />;
    if (c.kind === 'choice') return (
      <select aria-label={aria} value={String(r[c.field] ?? '')} style={{ width: '100%', color: c.tone?.[String(r[c.field])], fontWeight: c.tone ? 700 : undefined }} onChange={(e) => setField(coll, r.id, c.field, e.target.value)}>
        {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (c.kind === 'link') return <LazySelect ariaLabel={aria} emptyLabel={c.emptyLabel} value={String(r[c.field] ?? '')} options={c.options} onChange={(v) => setField(coll, r.id, c.field, v || null)} style={{ width: '100%' }} />;
    if (c.kind === 'static') return <small className="ac-muted">{c.text(r)}</small>;
    return c.render(r);
  };
  return (
    <>
      {cap && rows.length > cap && <p role="note" className="ac-callout ac-callout-warn">Showing the first {cap} of {rows.length.toLocaleString('en-US')} {noun} — editing stays available on these; all {rows.length.toLocaleString('en-US')} are counted by the KPIs.</p>}
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr>{cols.map((c) => <th key={c.header} scope="col">{c.header}</th>)}<th scope="col"><span className="ac-sr">Actions</span></th></tr></thead>
          <tbody>
            {shown.length ? shown.map((r) => (
              <tr key={r.id}>{cols.map((c) => <td key={c.header}>{cell(c, r)}</td>)}
                <td>{canDelete && <ConfirmButton label="🗑" confirmText="" onConfirm={() => removeRecord(coll, r.id)} />}</td></tr>
            )) : <tr><td colSpan={cols.length + 1} className="ac-muted">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => addRecord(coll)}>{addLabel}</button>
    </>
  );
}
