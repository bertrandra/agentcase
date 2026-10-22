import { useConsolidation } from '@/store/consolidationHooks';
import { fmtEurK } from '@/ui/format';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Cards } from './Cards';
import { CashChart } from './CashChart';
import { SummaryTable } from './SummaryTable';

const help = (
  <>
    <p>The portfolio trajectory is <strong>exactly the sum of the products&apos; own trajectories</strong>, each shifted to its start (wave start + offset) and cut at the portfolio horizon; nothing is recomputed here.
      Products without a wave (or archived) are left out. Payback is the first calendar month the consolidated cumulative cash is positive; the NPV discounts each calendar month from month 1.</p>
    <p>The by-wave and by-product lines add up to the total line, which is the portfolio headline. Change the start of a wave or move a product in the 🌊 Vagues section: every figure follows.</p>
  </>
);

const LABEL: Record<string, string> = {
  unscheduled: 'Produit non planifié', truncated: 'Coupé à l’horizon', 'kt-lead-clamped': 'Préparation plafonnée au mois 1', 'target-capped': 'Cible plafonnée', 'hub-unused': 'Hub inutilisé',
};

/** Consolidation — the portfolio trajectory (F15, F16): cards, cumulative cash by month, by wave, by product, by year, diagnostics. */
export default function ConsolidationSection() {
  const v = useConsolidation();
  return (
    <SectionFrame title="📈 Consolidation" help={help}
      result={
        <>
          <Cards h={v.headline} />
          <Panel title="Trésorerie cumulée par mois calendaire"><CashChart chart={v.chart} /></Panel>
          <Panel title="Par vague"><SummaryTable caption="Consolidation par vague" first="Vague" rows={v.waves} totals={v.totals} withCount /></Panel>
          <Panel title="Par produit"><SummaryTable caption="Consolidation par produit" first="Produit" rows={v.products} totals={v.totals} /></Panel>
          <Panel title="Par année calendaire">
            <div className="ac-table-wrap" tabIndex={0}>
              <table className="ac-table ac-cons-table">
                <caption>Flux du portefeuille par année calendaire</caption>
                <thead><tr><th scope="col">Année</th><th scope="col">Économies</th><th scope="col">Coût de fonctionnement</th><th scope="col">Mise en place</th><th scope="col">Net</th></tr></thead>
                <tbody>{v.years.map((y) => <tr key={y.label}><th scope="row">{y.label}</th><td>{fmtEurK(y.savings)}</td><td>{fmtEurK(y.run)}</td><td>{fmtEurK(y.setup)}</td><td>{fmtEurK(y.net)}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          <Callout>La VAN d’un produit est ici calendaire (actualisée depuis le mois 1 du portefeuille) ; sa VAN depuis son propre démarrage est dans la section Produits.</Callout>
        </>
      }
      diagnostic={
        <Panel title="Diagnostics">
          {v.diagnostics.length === 0 ? <p className="ac-muted">Aucun diagnostic : tous les produits sont planifiés et tiennent dans l’horizon.</p> : (
            <ul aria-label="Diagnostics de la consolidation">
              {v.diagnostics.map((d, i) => <li key={`${d.code}-${d.productId ?? ''}-${i}`} data-code={d.code}><strong>{LABEL[d.code] ?? d.code}</strong> — {d.message}</li>)}
            </ul>
          )}
          {v.excluded.length > 0 && <p className="ac-muted">Exclus de la consolidation : {v.excluded.map((e) => `${e.name}${e.archived ? ' (archivé)' : ''}`).join(', ')}.</p>}
        </Panel>
      } />
  );
}
