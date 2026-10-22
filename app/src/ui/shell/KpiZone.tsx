import { useScopeKpis } from '@/store/consolidationHooks';
import { useCaseResult } from '@/store/hooks';
import { fmtEurK, fmtMonths, fmtPct } from '../format';
import { fmt1 } from '../economicsFormat';
import { Kpi } from './Kpi';
import { ScopeKpis } from './ScopeKpis';

/** Sticky headline results: the active product's (recomputed from the document), or the Portefeuille's / a Vague's when the display scope says so (F17). */
export function KpiZone() {
  const scope = useScopeKpis();
  return scope ? <ScopeKpis label={scope.label} h={scope.headline} /> : <ProductKpis />;
}

function ProductKpis() {
  const r = useCaseResult(), m = r.model, e = r.endYear, cr = r.costReduction, fte = r.fte;   // end-year figures come from the Time Engine rows (model() arrays hold three entries)
  return (
    <aside className="ac-kpis" aria-label="Headline results" style={{ gridArea: 'kpi' }}>
      <Kpi label="FTE before" value={fmt1(fte.before)} tone="blue" title="Total AS-IS headcount: the sum of the input team rows (FTE)." />
      <Kpi label={`FTE after Y${e.index}`} value={fmt1(fte.after)} tone="teal" title={`Total human FTE at the horizon end (year ${e.index}): delivery team plus the agentic run team (AgentOps), so the reduction is not overstated. Reduction: ${fmtPct(fte.reductionPct)}.`} />
      <Kpi label={`Savings Y${e.index}`} value={fmtEurK(e.savings)} tone="teal" title={`Saving in year ${e.index} (the horizon end) against the AS-IS baseline: baseline cost minus the to-be run cost, from the Time Engine.`} />
      <Kpi label={`Run cost Y${e.index}`} value={fmtEurK(e.run)} tone="amber" title={`Total to-be run cost in year ${e.index}: remaining team, agentic run team, tokens, infrastructure and taxes.`} />
      <Kpi label={`Saving over ${cr.years} yr`} value={cr.ok ? fmtPct(cr.net * 100) : 'n/a'} tone={cr.ok && cr.net < 0 ? 'brick' : 'teal'}
        title={cr.ok ? `Net cost reduction over the ${cr.years}-year project: baseline ${fmtEurK(cr.base)} vs ${fmtEurK(cr.tobe)} to-be (run + tokens + infra + run team + ${fmtEurK(cr.setup)} setup). Excluding setup: ${fmtPct(cr.gross * 100)}.` : 'No baseline cost: set the AS-IS team and rate card.'} />
      <Kpi label={`Velocity Y${e.index}`} value={`${r.velocityPct >= 0 ? '+' : ''}${r.velocityPct}%`} tone="teal" title={`Delivery velocity uplift in year ${e.index} (the horizon end) versus the AS-IS velocity: story points per sprint reached at the adoption of that year, kept within the case anchors.`} />
      <Kpi label="Payback" value={fmtMonths(r.payback)} tone="blue" title="First month in which the cumulative net cash flow, setup included, turns positive." />
      <Kpi label="Effective automation" value={fmtPct(m.eff)} tone="teal" title="Share of the work effectively automated: potential, capped by the glass ceiling, adjusted for posture, context and hub multiplier." />
      <Kpi label="Glass ceiling" value={fmtPct(m.ceiling)} tone="brick" title="Irreducible human-supervision floor: the share of the work that must stay human, whatever the automation potential." />
    </aside>
  );
}
