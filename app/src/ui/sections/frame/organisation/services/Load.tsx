import type { ServiceView } from '@/domain/portfolio';
import { useServiceLoad } from '@/store/serviceHooks';
import type { ViewScope } from '@/store/viewScope';
import { goSection } from '@/ui/uiState';
import { fmtNum } from '@/ui/widgets/orgFormat';

/**
 * A service's load against its capacity, month by month (the B9d resource histogram's engine months, `serviceLoad`): the FTE its activities take
 * in each product of the View, their total and the capacity (its lines' FTE); a month above it is flagged (a diagnostic, no levelling).
 */
export function Load({ v, scope }: { v: ServiceView; scope: Pick<ViewScope, 'kind' | 'productIds'> }) {
  const h = useServiceLoad(v, scope), n = h.total.length;
  if (!n) return <p>{`No load: ${v.name} does no activity for the products of the View.`}</p>;
  const peak = h.total.reduce((b, x, i) => (x > h.total[b]! ? i : b), 0), cal = scope.kind === 'product' ? 'product month' : 'calendar month';
  return (
    <>
      <p aria-live="polite">{`Load of ${v.name}: peak ${fmtNum(h.total[peak]!)} FTE in ${cal} ${h.from + peak} against a capacity of `
        + `${fmtNum(h.capacity)} FTE; ${h.flags.length ? `${h.flags.length} month${h.flags.length === 1 ? '' : 's'} over capacity` : 'never over capacity'}.`}
        {' '}<button type="button" className="ac-link" onClick={() => goSection('gantt')}>Open the resource histogram in Plan</button></p>
      <details>
        <summary>{`Month by month (${n} months)`}</summary>
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table">
            <caption>{`Load of ${v.name} by ${cal} (FTE)`}</caption>
            <thead><tr><th scope="col">Month</th>{h.rows.map((r) => <th key={r.productId} scope="col">{r.name}</th>)}
              <th scope="col">Total</th><th scope="col">Capacity</th></tr></thead>
            <tbody>{h.total.map((t, i) => {
              const over = t > h.capacity + 1e-9;
              return (
                <tr key={i}>
                  <th scope="row">{h.from + i}</th>
                  {h.rows.map((r) => <td key={r.productId} className="ac-num">{fmtNum(r.fte[i]!)}</td>)}
                  <td className="ac-num"><b className="ac-tone" data-tone={over ? 'danger-800' : 'slate-700'}>{fmtNum(t)}</b>
                    {over && <span className="ac-sr"> (over capacity)</span>}</td>
                  <td className="ac-num">{fmtNum(h.capacity)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </details>
    </>
  );
}
