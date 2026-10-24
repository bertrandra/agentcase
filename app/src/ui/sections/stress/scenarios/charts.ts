import type { ChartConfiguration } from 'chart.js';
import { cumAt, fmtE, monthAxis, type Scenario } from '@/domain/stress';
import type { TokenName } from '@/domain/theme';
import type { Tok } from '@/domain/theme/resolve';

const YEAR_COLORS: readonly TokenName[] = ['chart-seq-1', 'chart-seq-2', 'chart-seq-3', 'chart-seq-4', 'chart-seq-5', 'chart-seq-6', 'chart-seq-7', 'chart-seq-8', 'chart-seq-9', 'chart-seq-10'];

/** Grouped bars: annual run cost of every scenario, one series per year of the horizon. */
export function costChart(S: Scenario[], tok: Tok): ChartConfiguration {
  const H = (S[0] as Scenario).m.yearRun.length, base = (S[0] as Scenario).m.baselineRun;
  return {
    type: 'bar',
    data: { labels: S.map((s) => s.label), datasets: Array.from({ length: H }, (_, i) => ({ label: `Year ${i + 1}`, data: S.map((s) => Math.round(s.m.yearRun[i] as number)), backgroundColor: tok(YEAR_COLORS[i % YEAR_COLORS.length]!) })) },
    options: { plugins: { legend: { position: 'bottom' }, title: { display: true, text: `Annual run cost (€) — lower is better · AS-IS baseline = ${fmtE(base)}` } },
      scales: { y: { title: { display: true, text: '€ / year' } } } },
  };
}

/** Cumulative cash-flow (€ thousands) over the horizon for every scenario but AS-IS; the crossover with 0 is the payback. */
export function roiChart(S: Scenario[], tok: Tok): ChartConfiguration {
  const months = monthAxis((S[0] as Scenario).m.horizon);
  return {
    type: 'line',
    data: { labels: months.map((m) => `M${m}`), datasets: S.filter((s) => s.key !== 'asis').map((s) => ({
      label: s.label, data: months.map((mo) => Math.round(cumAt(s.m, mo) / 1000)), borderColor: tok(s.tone), backgroundColor: `${tok(s.tone)}22`, tension: 0.25, fill: false, borderWidth: 2, pointRadius: 2 })) },
    options: { plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Cumulative cash-flow (€ thousands) — crossover with 0 = payback' } },
      scales: { y: { title: { display: true, text: '€ thousands' } } } },
  };
}
