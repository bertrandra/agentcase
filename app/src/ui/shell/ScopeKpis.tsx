import type { PortfolioHeadline } from '@/domain/portfolio';
import { fmtEurK, fmtPct } from '../format';
import { HeadlineTiles, type HeadlineFigures } from './HeadlineTiles';
import { Kpi } from './Kpi';

/**
 * The headline figures of the Portfolio or of a Wave (F17): the same tiles as for a product, read from the consolidated series
 * through the domain headline (calendar years, products weighted by their entry headcount where a figure is an average). Every tile says its scope.
 */
export function ScopeKpis({ label, h }: { label: string; h: PortfolioHeadline }) {
  const e = h.endYear, cr = h.costReduction, fte = h.fte, who = `${label} (${h.products} planned product${h.products > 1 ? 's' : ''})`;
  const f: HeadlineFigures = { fte, year: e.index, savings: e.savings, run: e.run, cr, velocity: { raw: h.velocityPct, shown: Math.round(h.velocityPct) },
    payback: h.paybackMonth, eff: h.eff, ceiling: h.ceiling };
  return (
    <aside className="ac-kpis" aria-label={`Headline results — ${label}`} data-scope={label}>
      <Kpi label="Scope" value={label} tone="grey" title={`Scope of the figures: ${who}. Change it with “Show” in the top bar.`} />
      <HeadlineTiles f={f} titles={{
        fteBefore: `${who}: total AS-IS headcount, summed over the products (FTE).`,
        fteAfter: `${who}: total human FTE at each product's horizon end (delivery plus agentic run team), summed over the products. Reduction: ${fmtPct(fte.reductionPct)}.`,
        savings: `${who}: savings of calendar year ${e.index} (the horizon end), summed over the products, each shifted to its own start.`,
        run: `${who}: to-be run cost of calendar year ${e.index}, summed over the products.`,
        saving: cr.ok ? `${who}: net cost reduction over the horizon, (savings − setup) / baseline cost summed over the products: baseline ${fmtEurK(cr.base)} vs ${fmtEurK(cr.tobe)} to-be (incl. ${fmtEurK(cr.setup)} setup). Excluding setup: ${fmtPct(cr.gross * 100)}.` : `${who}: no baseline cost.`,
        velocity: `${who}: delivery velocity uplift at the horizon end, averaged over the products weighted by their entry headcount.`,
        payback: `${who}: first calendar month in which the cumulative net cash flow of the scope, setup included, turns positive (month 1 = portfolio start).`,
        eff: `${who}: effective automation averaged over the products weighted by their entry headcount.`,
        ceiling: `${who}: irreducible human-supervision floor averaged over the products weighted by their entry headcount.`,
      }} />
    </aside>
  );
}
