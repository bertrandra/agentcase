import { useCaseResult } from '@/store/hooks';
import { fmtEurK, fmtMonths, fmtPct } from '../format';

const Kpi = ({ label, value, tone, title }: { label: string; value: string; tone: string; title?: string }) => (
  <div className="ac-kpi" data-tone={tone} title={title}><span className="ac-kpi-v">{value}</span><span className="ac-kpi-l">{label}</span></div>
);

/** Sticky headline results, recomputed from the document on every change. */
export function KpiZone() {
  const r = useCaseResult(), m = r.model, e = r.endYear, cr = r.costReduction;   // end-year figures come from the Time Engine rows (model() arrays hold three entries)
  return (
    <aside className="ac-kpis" aria-label="Headline results" style={{ gridArea: 'kpi' }}>
      <Kpi label={`Savings Y${e.index}`} value={fmtEurK(e.savings)} tone="teal" />
      <Kpi label={`Run cost Y${e.index}`} value={fmtEurK(e.run)} tone="amber" />
      <Kpi label={`Saving over ${cr.years} yr`} value={cr.ok ? fmtPct(cr.net * 100) : 'n/a'} tone={cr.ok && cr.net < 0 ? 'brick' : 'teal'}
        title={cr.ok ? `Net cost reduction over the ${cr.years}-year project: baseline ${fmtEurK(cr.base)} vs ${fmtEurK(cr.tobe)} to-be (run + tokens + infra + run team + ${fmtEurK(cr.setup)} setup). Excluding setup: ${fmtPct(cr.gross * 100)}.` : 'No baseline cost: set the AS-IS team and rate card.'} />
      <Kpi label="NPV" value={fmtEurK(r.npv)} tone="blue" />
      <Kpi label="Payback" value={fmtMonths(r.payback)} tone="blue" />
      <Kpi label="Effective automation" value={fmtPct(m.eff)} tone="teal" />
      <Kpi label="Glass ceiling" value={fmtPct(m.ceiling)} tone="brick" />
    </aside>
  );
}
