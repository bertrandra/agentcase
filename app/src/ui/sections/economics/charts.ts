import type { ChartConfiguration } from 'chart.js';
import { decimate, yLabel, type EconomicsView } from '@/domain/economics';
import { tickK } from '@/ui/economicsFormat';
import type { Tok } from '@/domain/theme/resolve';

const grid = (tok: Tok) => ({ color: tok('chart-grid') });
const kTick = (v: number | string) => `€${Number(v) / 1000}K`;

/** Stacked annual run-cost bars (team / agentic run / tokens / infra) shared by the Run and Annual sections. */
export function runBars(v: EconomicsView, o: { label: (i: number) => string; names: [string, string]; yTitle?: boolean }, tok: Tok): ChartConfiguration {
  const ys = v.years, ds = (label: string, data: number[], backgroundColor: string) => ({ label, data, backgroundColor });
  return {
    type: 'bar',
    data: { labels: ys.map((_, i) => o.label(i)), datasets: [
      ds(o.names[0], ys.map((y) => y.teamCost), tok('primary-950-a80')), ds(o.names[1], ys.map((y) => y.runTeamCost), tok('secondary-575-a70')),
      ds('Tokens', ys.map((y) => y.tokenCost), tok('success-500-a80')), ds('Infra', ys.map((y) => y.infrastructureCost), tok('warning-500-a80')),
    ] },
    options: { plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true },
      y: { stacked: true, ...(o.yTitle ? { title: { display: true, text: '€/year' } } : {}), ticks: { callback: kTick }, grid: grid(tok) } } },
  };
}

/** Cumulative cash-flow line; the segment colour flips at break-even (the J-curve crossing). */
export function cashflowLine(v: EconomicsView, tok: Tok): ChartConfiguration {
  const s = decimate(v.months, v.months.length > 40 ? 2 : 1);
  return {
    type: 'line',
    data: { labels: s.map((x) => `M${x.mo}`),
      datasets: [{ label: 'Cumulative cash-flow', data: s.map((x) => x.cum), borderColor: tok('chart-cat-1'), borderWidth: 3, tension: 0.3, pointRadius: 1,
      segment: { borderColor: (c: { p1: { parsed: { y: number } } }) => (c.p1.parsed.y >= 0 ? tok('chart-cat-2') : tok('chart-cat-3')) } }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: tickK }, grid: grid(tok) }, x: { ticks: { maxTicksLimit: 18 } } } },
  };
}

/** Monthly total cost and saving bars with the cumulative cash-flow line on a second axis. */
export function monthlyMix(v: EconomicsView, tok: Tok): ChartConfiguration {
  const s = decimate(v.months, v.months.length > 40 ? 3 : 1);
  return {
    type: 'bar',
    data: { labels: s.map((x) => `M${x.mo}`), datasets: [
      { type: 'bar', label: 'Total cost', data: s.map((x) => x.total), backgroundColor: tok('warning-500-a50'), yAxisID: 'y' },
      { type: 'bar', label: 'Saving', data: s.map((x) => x.sav), backgroundColor: tok('success-500-a50'), yAxisID: 'y' },
      { type: 'line', label: 'Cumulative cash-flow', data: s.map((x) => x.cum), borderColor: tok('chart-cat-1'), borderWidth: 3, tension: 0.3, yAxisID: 'y2',
        pointRadius: 1 },
    ] },
    options: { plugins: { legend: { position: 'top' } }, scales: {
      y: { position: 'left', title: { display: true, text: '€/month' }, ticks: { callback: tickK }, grid: grid(tok) },
      y2: { position: 'right', title: { display: true, text: 'Cumulative €' }, ticks: { callback: tickK }, grid: { drawOnChartArea: false } },
      x: { ticks: { maxTicksLimit: 20 } } } },
  };
}

export const yearLabels = (n: number): string[] => Array.from({ length: n }, (_, i) => yLabel(i + 1));
