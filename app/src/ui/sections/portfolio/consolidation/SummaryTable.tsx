import type { SummaryRow } from '@/domain/portfolio';
import { fmtEurK, fmtMonths } from '@/ui/format';

const HEAD: [string, string][] = [
  ['VAN calendaire', 'Actualisée depuis le mois 1 du portefeuille (somme des lignes = VAN du portefeuille)'], ['Net', 'Économies moins mise en place'], ['Mise en place', ''],
  ['Économies', 'Économies cumulées sur l’horizon calendaire'], ['Coût de fonctionnement', 'Cumul du coût de fonctionnement'], ['ETP humains', 'ETP humains au dernier mois de l’horizon'],
  ['vFTE agents', 'vFTE agents au dernier mois de l’horizon'], ['Retour', 'Premier mois calendaire où la trésorerie cumulée est positive'],
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
export function SummaryTable({ caption, first, rows, totals, withCount, totalLabel = 'Total — portefeuille' }: { caption: string; first: string; rows: SummaryRow[]; totals: SummaryRow; withCount?: boolean; totalLabel?: string }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table ac-cons-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{first}</th>{withCount && <th scope="col">Produits</th>}
            {HEAD.map(([h, t]) => <th key={h} scope="col" title={t || undefined} style={R}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <tr key={r.id} data-row={r.id}><th scope="row">{r.name}</th>{withCount && <td style={R}>{r.products}</td>}<Cells r={r} /></tr>)}
          {!rows.length && <tr><td colSpan={HEAD.length + 1 + (withCount ? 1 : 0)}>Aucun produit planifié.</td></tr>}
        </tbody>
        <tfoot><tr data-row="total"><th scope="row">{totalLabel}</th>{withCount && <td style={R}>{totals.products}</td>}<Cells r={totals} /></tr></tfoot>
      </table>
    </div>
  );
}
