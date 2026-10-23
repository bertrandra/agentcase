import type { ChartConfiguration } from 'chart.js';
import type { PlannedQuarter, TrackActual } from '@/domain/frame';
import { tok } from '@/domain/theme';

type Actuals = Record<string, TrackActual | undefined>;
const line = (labels: string[], plan: number[], actual: (number | null)[], planLabel: string, actualLabel: string, yTitle: string, max?: number): ChartConfiguration => ({
  type: 'line',
  data: { labels, datasets: [
    { label: planLabel, data: plan, get borderColor() { return tok('info-700'); }, get backgroundColor() { return tok('primary-500-a12'); }, fill: true, tension: 0.25, pointRadius: 3 },
    { label: actualLabel, data: actual, get borderColor() { return tok('teal-700'); }, backgroundColor: 'transparent', borderWidth: 2, spanGaps: true, pointRadius: 4 },
  ] },
  options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { min: max === undefined ? undefined : 0, max, title: { display: true, text: yTitle } } } },
});

/** Adoption (%) and cumulative savings (€ thousands), planned vs actual, one point per quarter. */
export function trackerCharts(q: PlannedQuarter[], actuals: Actuals): { adoption: ChartConfiguration; savings: ChartConfiguration } {
  const labels = q.map((x) => x.label), at = (i: number) => actuals['q' + (i + 1)];
  return {
    adoption: line(labels, q.map((x) => x.ad), q.map((_, i) => at(i)?.ad ?? null), 'Planned', 'Actual', '%', 100),
    savings: line(labels, q.map((x) => Math.round(x.savPlan / 1000)), q.map((_, i) => { const v = at(i)?.sav; return v != null ? Math.round(v / 1000) : null; }),
      'Planned (cum.)', 'Actual (cum.)', '€ thousands'),
  };
}
