import type { SummaryRow } from '@/domain/portfolio';
import { fmtEurK, fmtMonths } from '@/ui/format';

const HEAD: [string, string][] = [
  ['Calendar NPV', 'Discounted from month 1 of the portfolio (sum of the lines = portfolio NPV)'], ['Net', 'Savings minus setup'], ['Setup', ''],
  ['Savings', 'Cumulative savings over the calendar horizon'], ['Run cost', 'Cumulative run cost'], ['Human FTE', 'Human FTE in the last month of the horizon'],
  ['Agent vFTE', 'Agent vFTE in the last month of the horizon'], ['Payback', 'First calendar month the cumulative cash is positive'],
];
const R = { textAlign: 'right' } as const;

function Cells({ r }: { r: SummaryRow }) {
  return (
    <>
      <td style={R}>{fmtEurK(r.npv)}</td><td style={R}>{fmtEurK(r.net)}</td><td style={R}>{fmtEurK(r.setup)}</td><td style={R}>{fmtEurK(r.savings)}</td>
      <td style={R}>{fmtEurK(r.run)}</td><td style={R}>{r.etp.toFixed(1)}</td><td style={R}>{r.vfte.toFixed(1)}</td><td style={R}>{fmtMonths(r.paybackMonth)}</td>
    </>
  );
}

/** A by-wave or by-product table with the portfolio totals line (the headline of the consolidated series, which the lines add up to). */
export function SummaryTable({ caption, first, rows, totals, withCount, totalLabel = 'Total — portfolio' }: { caption: string; first: string; rows: SummaryRow[]; totals: SummaryRow; withCount?: boolean; totalLabel?: string }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table ac-cons-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{first}</th>{withCount && <th scope="col">Products</th>}
            {HEAD.map(([h, t]) => <th key={h} scope="col" title={t || undefined} style={R}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <tr key={r.id} data-row={r.id}><th scope="row">{r.name}</th>{withCount && <td style={R}>{r.products}</td>}<Cells r={r} /></tr>)}
          {!rows.length && <tr><td colSpan={HEAD.length + 1 + (withCount ? 1 : 0)}>No scheduled product.</td></tr>}
        </tbody>
        <tfoot><tr data-row="total"><th scope="row">{totalLabel}</th>{withCount && <td style={R}>{totals.products}</td>}<Cells r={totals} /></tr></tfoot>
      </table>
    </div>
  );
}
