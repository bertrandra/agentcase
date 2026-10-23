import type { ChartConfiguration } from 'chart.js';
import { cumAt, fmtE, monthAxis, type Scenario } from '@/domain/stress';
import { tok, themedList } from '@/domain/theme';

const YEAR_COLORS = themedList(['primary-200', 'primary-350', 'info-700', 'primary-700', 'primary-900', 'primary-400', 'primary-600', 'primary-825', 'primary-930', 'primary-960']);

/** Grouped bars: annual run cost of every scenario, one series per year of the horizon. */
export function costChart(S: Scenario[]): ChartConfiguration {
  const H = (S[0] as Scenario).m.yearRun.length, base = (S[0] as Scenario).m.baselineRun;
  return {
    type: 'bar',
    data: { labels: S.map((s) => s.label), datasets: Array.from({ length: H }, (_, i) => ({ label: `Year ${i + 1}`, data: S.map((s) => Math.round(s.m.yearRun[i] as number)), backgroundColor: YEAR_COLORS[i % YEAR_COLORS.length] })) },
    options: { plugins: { legend: { position: 'bottom' }, title: { display: true, text: `Annual run cost (€) — lower is better · AS-IS baseline = ${fmtE(base)}` } },
      scales: { y: { title: { display: true, text: '€ / year' } } } },
  };
}

/** Cumulative cash-flow (€ thousands) over the horizon for every scenario but AS-IS; the crossover with 0 is the payback. */
export function roiChart(S: Scenario[]): ChartConfiguration {
  const months = monthAxis((S[0] as Scenario).m.horizon);
  return {
    type: 'line',
    data: { labels: months.map((m) => `M${m}`), datasets: S.filter((s) => s.key !== 'asis').map((s) => ({
      label: s.label, data: months.map((mo) => Math.round(cumAt(s.m, mo) / 1000)), borderColor: s.color, backgroundColor: `${s.color}22`, tension: 0.25, fill: false, borderWidth: 2, pointRadius: 2 })) },
    options: { plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Cumulative cash-flow (€ thousands) — crossover with 0 = payback' } },
      scales: { y: { title: { display: true, text: '€ thousands' } } } },
  };
}
