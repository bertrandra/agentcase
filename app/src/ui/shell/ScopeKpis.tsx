import type { PortfolioHeadline } from '@/domain/portfolio';
import { fmtEurK, fmtMonths, fmtPct } from '../format';
import { fmt1 } from '../economicsFormat';
import { Kpi } from './Kpi';

/**
 * The headline figures of the Portefeuille or of a Vague (F17): the same seven tiles as for a product, read from the consolidated series
 * through the domain headline (calendar years, products weighted by their entry headcount where a figure is an average). Every tile says its scope.
 */
export function ScopeKpis({ label, h }: { label: string; h: PortfolioHeadline }) {
  const e = h.endYear, cr = h.costReduction, fte = h.fte, who = `${label} (${h.products} produit${h.products > 1 ? 's' : ''} planifié${h.products > 1 ? 's' : ''})`;
  return (
    <aside className="ac-kpis" aria-label={`Headline results — ${label}`} data-scope={label} style={{ gridArea: 'kpi' }}>
      <Kpi label="Périmètre" value={label} tone="grey" title={`Scope of the figures: ${who}. Change it with the Périmètre d’affichage selector in the top bar.`} />
      <Kpi label="FTE before" value={fmt1(fte.before)} tone="blue" title={`${who}: total AS-IS headcount, summed over the products (FTE).`} />
      <Kpi label={`FTE after Y${e.index}`} value={fmt1(fte.after)} tone="teal" title={`${who}: total human FTE at each product's horizon end (delivery plus agentic run team), summed over the products. Reduction: ${fmtPct(fte.reductionPct)}.`} />
      <Kpi label={`Savings Y${e.index}`} value={fmtEurK(e.savings)} tone="teal" title={`${who}: savings of calendar year ${e.index} (the horizon end), summed over the products, each shifted to its own start.`} />
      <Kpi label={`Run cost Y${e.index}`} value={fmtEurK(e.run)} tone="amber" title={`${who}: to-be run cost of calendar year ${e.index}, summed over the products.`} />
      <Kpi label={`Saving over ${cr.years} yr`} value={cr.ok ? fmtPct(cr.net * 100) : 'n/a'} tone={cr.ok && cr.net < 0 ? 'brick' : 'teal'}
        title={cr.ok ? `${who}: net cost reduction over the horizon, (savings − setup) / baseline cost summed over the products: baseline ${fmtEurK(cr.base)} vs ${fmtEurK(cr.tobe)} to-be (incl. ${fmtEurK(cr.setup)} setup). Excluding setup: ${fmtPct(cr.gross * 100)}.` : `${who}: no baseline cost.`} />
      <Kpi label={`Velocity Y${e.index}`} value={`${h.velocityPct >= 0 ? '+' : ''}${Math.round(h.velocityPct)}%`} tone="teal" title={`${who}: delivery velocity uplift at the horizon end, averaged over the products weighted by their entry headcount.`} />
      <Kpi label="Payback" value={fmtMonths(h.paybackMonth)} tone="blue" title={`${who}: first calendar month in which the cumulative net cash flow of the scope, setup included, turns positive (month 1 = portfolio start).`} />
      <Kpi label="Effective automation" value={fmtPct(h.eff)} tone="teal" title={`${who}: effective automation averaged over the products weighted by their entry headcount.`} />
      <Kpi label="Glass ceiling" value={fmtPct(h.ceiling)} tone="brick" title={`${who}: irreducible human-supervision floor averaged over the products weighted by their entry headcount.`} />
    </aside>
  );
}
