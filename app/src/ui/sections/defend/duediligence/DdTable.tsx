import { ddStatus } from '@/domain/pdc/dd';
import { ClassChip, EditCell, StateCell, UseCell, ValueCell, WeightCell } from './Cells';
import type { DdModel } from './useDd';

const HEAD = ['Used in', 'Element / effect on the result', 'Value', 'Where', 'Editable in', '€ weight', 'Class', 'State'];

/** The register: one row per item to confirm, grouped; editors for the values that can be edited here. */
export function DdTable({ m }: { m: DdModel }) {
  let group: string | null = null;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <thead><tr>{HEAD.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {m.rows.flatMap((r) => {
            const head = r.g !== group ? <tr key={`g-${r.id}`} style={{ background: 'var(--ac-primary-80)' }}><td colSpan={8} style={{ fontWeight: 'var(--ac-font-weight-bold)', color: 'var(--ac-blue)', fontSize: 'var(--ac-font-size-sm)' }}>{r.g}</td></tr> : null;
            group = r.g;
            return [head, (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}><UseCell r={r} /></td>
                <td><strong>{r.l}</strong><div style={{ fontSize: 'var(--ac-font-size-xs-plus)', color: 'var(--ac-neutral-700)', marginTop: 2 }}>{r.eff}</div></td>
                <td style={{ fontWeight: 'var(--ac-font-weight-semibold)', textAlign: 'center', whiteSpace: 'nowrap' }}><ValueCell r={r} /></td>
                <td style={{ fontSize: 'var(--ac-font-size-xs-plus)', textAlign: 'center' }}>{r.where}</td>
                <td style={{ fontSize: 'var(--ac-font-size-xs-plus)', textAlign: 'center' }}><EditCell e={r.edit} /></td>
                <td style={{ textAlign: 'center', fontSize: 'var(--ac-font-size-sm)' }}><WeightCell fresh={m.fresh} w={m.weight(r.id)} /></td>
                <td style={{ textAlign: 'center' }}><ClassChip cls={r.cls} /></td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}><StateCell r={r} st={ddStatus(m.c, r.id)} /></td>
              </tr>)];
          })}
        </tbody>
      </table>
    </div>
  );
}
