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
            const head = r.g !== group ? <tr key={`g-${r.id}`} className="ac-group-row"><td colSpan={8}>{r.g}</td></tr> : null;
            group = r.g;
            return [head, (
              <tr key={r.id}>
                <td className="ac-c ac-nowrap"><UseCell r={r} /></td>
                <td><strong>{r.l}</strong><div className="ac-dd-effect">{r.eff}</div></td>
                <td className="ac-c ac-nowrap ac-dd-value"><ValueCell r={r} /></td>
                <td className="ac-c ac-dd-xs">{r.where}</td>
                <td className="ac-c ac-dd-xs"><EditCell e={r.edit} /></td>
                <td className="ac-c ac-small"><WeightCell fresh={m.fresh} w={m.weight(r.id)} /></td>
                <td className="ac-c"><ClassChip cls={r.cls} /></td>
                <td className="ac-c ac-nowrap"><StateCell r={r} st={ddStatus(m.c, r.id)} /></td>
              </tr>)];
          })}
        </tbody>
      </table>
    </div>
  );
}
