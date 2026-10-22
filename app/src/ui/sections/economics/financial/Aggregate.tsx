import { useSelectionView } from '@/store/selectionHooks';
import { fmtEurK } from '@/ui/format';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Cards } from '../../portfolio/consolidation/Cards';
import { CashChart } from '../../portfolio/consolidation/CashChart';
import { SummaryTable } from '../../portfolio/consolidation/SummaryTable';

const help = (
  <>
    <p>The money view of the <strong>selection</strong> (Portefeuille or one Vague) instead of one product. It is the consolidation of <code>domain/portfolio</code>: each planned product&apos;s own Time Engine
      months, shifted to its start (wave start + offset) and added up. ROI, payback and NPV are those of the consolidated cash-flow, not an average of the products&apos;.</p>
    <p>Products without a wave, or archived, are left out (the banner above says how many). Choose a Produit in the Vue selector for the full single-product Financial Summary.</p>
  </>
);

/** Financial Summary — Vue agrégée (R-conso exemplar): cards, cumulative cash, by-product table and calendar years of the Portefeuille / Vague, all from the domain view. */
export default function FinancialAggregate() {
  const v = useSelectionView();
  if (!v) return null;
  return (
    <SectionFrame title={`Financial Summary — ${v.label}`} help={help}
      result={
        <>
          <p className="ac-muted">Vue consolidée de la sélection : {v.label} ({v.rows.length} produit{v.rows.length > 1 ? 's' : ''} planifié{v.rows.length > 1 ? 's' : ''}). Chaque chiffre est lu de la consolidation du domaine.</p>
          <Cards h={v.headline} />
          <Panel title="Trésorerie cumulée par mois calendaire"><CashChart chart={v.chart} label={`Trésorerie cumulée par mois calendaire : ${v.label} et ses produits`} /></Panel>
          <Panel title="Par produit"><SummaryTable caption={`Chiffres par produit — ${v.label}`} first="Produit" rows={v.rows} totals={v.totals} totalLabel={`Total — ${v.label}`} /></Panel>
          <Panel title="Par année calendaire">
            <div className="ac-table-wrap" tabIndex={0}>
              <table className="ac-table ac-cons-table">
                <caption>Flux de la sélection par année calendaire — {v.label}</caption>
                <thead><tr><th scope="col">Année</th><th scope="col">Économies</th><th scope="col">Coût de fonctionnement</th><th scope="col">Mise en place</th><th scope="col">Net</th></tr></thead>
                <tbody>{v.years.map((y) => <tr key={y.label}><th scope="row">{y.label}</th><td>{fmtEurK(y.savings)}</td><td>{fmtEurK(y.run)}</td><td>{fmtEurK(y.setup)}</td><td>{fmtEurK(y.net)}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          {v.excluded.length > 0 && <Callout kind="blue">Exclus des chiffres (sans vague ou archivés) : {v.excluded.map((e) => `${e.name}${e.archived ? ' (archivé)' : ''}`).join(', ')}.</Callout>}
        </>
      } />
  );
}
