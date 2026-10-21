import { addRow, moveBodyRow, removeRow, setRowField, setRowSeq, setRowSource } from '@/controllers/pdcBoardRows';
import type { BoardRow, DynSection } from '@/domain/pdc/board';
import { sortedRows } from '@/domain/pdc/boardRows';
import { FmtPicker, SectionPicker, VarPicker } from './pickers';

/** The body rows of a dashboard — a label bound to one variable of its source section, shown as the summary band under the cards. */
export function RowsEditor({ section }: { section: DynSection }) {
  const id = section.id, rows = section.rows ?? [], order = sortedRows(rows);
  const label = (r: BoardRow) => r.label || r.id || 'row';
  return (
    <>
      <h4>Body rows <span className="ac-muted">— {rows.length}</span></h4>
      <p className="ac-muted">Set Source first — it decides which variables the Var picker can pick from. Format “(auto)” adopts the variable’s own format.</p>
      <div className="ac-table-wrap"><table className="ac-table">
        <caption className="sr-only">Body rows of {section.title}</caption>
        <thead><tr><th>Order</th><th>Label</th><th>Source</th><th>Var</th><th>Fmt</th><th>Default</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="ac-muted">No body rows.</td></tr>}
          {order.map((r, i) => r.id && (
            <tr key={r.id}>
              <td>
                <input type="number" aria-label={`Order of ${r.id}`} style={{ width: 56 }} value={r.seq || 0} onChange={(e) => setRowSeq(id, r.id!, parseFloat(e.target.value))} />{' '}
                <button type="button" className="ac-btn" aria-label={`Move ${r.id} up`} disabled={i === 0} onClick={() => moveBodyRow(id, r.id!, -1)}>▲</button>
                <button type="button" className="ac-btn" aria-label={`Move ${r.id} down`} disabled={i === order.length - 1} onClick={() => moveBodyRow(id, r.id!, 1)}>▼</button>
              </td>
              <td><input type="text" aria-label={`Label of ${r.id}`} value={r.label ?? ''} onChange={(e) => setRowField(id, r.id!, 'label', e.target.value)} /></td>
              <td><SectionPicker value={r.source ?? id} label={`Source of ${r.id}`} onChange={(v) => v && setRowSource(id, r.id!, v)} /></td>
              <td><VarPicker source={r.source ?? id} value={r.var} label={`Var of ${r.id}`} onChange={(v) => setRowField(id, r.id!, 'var', v ?? '')} /></td>
              <td><FmtPicker value={r.format} label={`Format of ${r.id}`} onChange={(v) => setRowField(id, r.id!, 'format', v ?? '')} /></td>
              <td><input type="text" aria-label={`Default of ${r.id}`} value={r.defaultValue != null ? String(r.defaultValue) : ''} onChange={(e) => setRowField(id, r.id!, 'defaultValue', e.target.value)} /></td>
              <td><button type="button" className="ac-btn" aria-label={`Remove ${r.id}`} onClick={() => removeRow(id, r.id!, label(r))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <button type="button" className="ac-btn" onClick={() => addRow(id)}>➕ Add row</button>
    </>
  );
}
