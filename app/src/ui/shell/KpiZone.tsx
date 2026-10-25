import { memo } from 'react';
import { displayedPayback } from '@/domain/economics/cashflow';
import { useScopeKpis } from '@/store/consolidationHooks';
import { caseResultOf, useDocSelector } from '@/store/hooks';
import { fmtEurK, fmtPct } from '../format';
import { HeadlineTiles, type HeadlineFigures, type TileTitles } from './HeadlineTiles';
import { ScopeKpis } from './ScopeKpis';

/** Sticky headline results: the active product's (recomputed from the document), or the Portfolio's / a Wave's when the display scope says so (F17). */
export function KpiZone() {
  const scope = useScopeKpis();
  return scope ? <ScopeKpis label={scope.label} h={scope.headline} /> : <ProductKpis />;
}

/**
 * The tiles of the active product, derived from its case result: a selector with structural equality, so an edit that changes no headline figure (a
 * name, a note, a persona list) renders nothing here, and an edit that does renders only the tiles whose value or tooltip changed (`Kpi` is memoised).
 */
const ProductKpis = memo(function ProductKpis() {
  const { f, titles } = useDocSelector((d) => headlineOf(caseResultOf(d)));
  return (
    <aside className="ac-kpis" aria-label="Headline results">
      <HeadlineTiles f={f} titles={titles} />
    </aside>
  );
});

function headlineOf(r: ReturnType<typeof caseResultOf>): { f: HeadlineFigures; titles: TileTitles } {
  const m = r.model, e = r.endYear, cr = r.costReduction, fte = r.fte;   // end-year figures come from the Time Engine rows (model() arrays hold three entries)
  const f: HeadlineFigures = { fte, year: e.index, savings: e.savings, run: e.run, cr, velocity: { raw: r.velocityPct, shown: r.velocityPct },
    payback: displayedPayback(r.payback, m.setupTotal, r.headline.totalSavings), eff: m.eff, ceiling: m.ceiling };   // no setup: immediate
  return { f, titles: {
    fteBefore: 'Total AS-IS headcount: the sum of the input team rows (FTE).',
    fteAfter: `Total human FTE at the horizon end (year ${e.index}): delivery team plus the agentic run team (AgentOps), so the reduction is not overstated. Reduction: ${fmtPct(fte.reductionPct)}.`,
    savings: `Saving in year ${e.index} (the horizon end) against the AS-IS baseline: baseline cost minus the to-be run cost, from the Time Engine.`,
    run: `Total to-be run cost in year ${e.index}: remaining team, agentic run team, tokens, infrastructure and taxes.`,
    saving: cr.ok
      ? `Net cost reduction over the ${cr.years}-year project: baseline ${fmtEurK(cr.base)} vs ${fmtEurK(cr.tobe)} to-be`
        + ` (run + tokens + infra + run team + ${fmtEurK(cr.setup)} setup). Excluding setup: ${fmtPct(cr.gross * 100)}.`
      : 'No baseline cost: set the AS-IS team and rate card.',
    velocity: `Delivery velocity uplift in year ${e.index} (the horizon end) versus the AS-IS velocity: story points per sprint reached at the adoption of that year, kept within the case anchors.`,
    payback: 'First month from which the cumulative net cash flow, setup included, stays positive; immediate when nothing was invested.',
    eff: 'Share of the work effectively automated: potential, capped by the glass ceiling, adjusted for posture, context and hub multiplier.',
    ceiling: 'Irreducible human-supervision floor: the share of the work that must stay human, whatever the automation potential.',
  } };
}
