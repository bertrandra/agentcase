import type { ChartConfiguration } from 'chart.js';
import { metricSeries, mpRange, MP_META, type MetricKey, type PlaybackSeries } from '@/domain/pdc/playback';
import type { TokenName } from '@/domain/theme';
import type { Tok } from '@/domain/theme/resolve';

const STYLE: Record<MetricKey, { colors: readonly TokenName[]; fills: readonly TokenName[]; labels: string[]; fill: boolean }> = {
  fte: { colors: ['warning-600', 'teal-700'], fills: ['warning-575-a12', 'teal-600-a12'], labels: ['Human FTE', 'Agent vFTE'], fill: true },
  cost: { colors: ['primary-700'], fills: ['primary-700-a10'], labels: ['Monthly run cost'], fill: true },
  savings: { colors: ['teal-700'], fills: ['teal-600-a10'], labels: ['Cumulative savings'], fill: true },
  velocity: { colors: ['info-700'], fills: ['info-375-a10'], labels: ['Velocity (SP/sprint)'], fill: false },
  costsp: { colors: ['secondary-600'], fills: ['secondary-600-a10'], labels: ['Cost / point'], fill: false },
};
/** The legend of a metric: each series' label and colour role (`var(--ac-<role>)` in CSS). */
export const legendOf = (k: MetricKey) => STYLE[k].labels.map((label, i) => ({ label, tone: STYLE[k].colors[i]! }));

/** Chart of one metric revealed up to `month` (the rest is null), on the metric's full-horizon axis range. */
export function playbackChart(s: PlaybackSeries, key: MetricKey, month: number, tok: Tok): ChartConfiguration {
  const st = STYLE[key], data = metricSeries(s, key), range = mpRange(data.flat());
  const labels = Array.from({ length: s.months + 1 }, (_, i) => (i === 0 ? 'AS-IS' : `M${i}`)), step = Math.max(1, Math.ceil(labels.length / 4));
  const pad = (a: number[]) => a.map((v, i) => (i <= month ? v : null));
  return {
    type: 'line',
    data: { labels, datasets: data.map((d, i) => ({ label: st.labels[i]!, data: pad(d), borderColor: tok(st.colors[i]!), backgroundColor: tok(st.fills[i]!),
      borderWidth: 3, tension: 0.35, fill: st.fill, pointRadius: 0, spanGaps: false, borderDash: key === 'fte' && i === 1 ? [6, 3] : [] })) as never },
    options: { animation: false, plugins: { legend: { display: false } },
      scales: { y: { min: range.min, max: range.max, title: { display: true, text: MP_META[key].yLabel } },
        x: { ticks: { callback: (_v, i) => (i % step === 0 ? labels[i] : '') } } } },
  };
}
