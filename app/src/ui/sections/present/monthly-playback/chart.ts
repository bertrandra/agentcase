import type { ChartConfiguration } from 'chart.js';
import { metricSeries, mpRange, MP_META, type MetricKey, type PlaybackSeries } from '@/domain/pdc/playback';

const STYLE: Record<MetricKey, { colors: string[]; fills: string[]; labels: string[]; fill: boolean }> = {
  fte: { colors: ['#b04600', '#006e79'], fills: ['rgba(190,77,0,.12)', 'rgba(0,130,142,.12)'], labels: ['Human FTE', 'Agent vFTE'], fill: true },
  cost: { colors: ['#0058AB'], fills: ['rgba(0,88,171,.1)'], labels: ['Monthly run cost'], fill: true },
  savings: { colors: ['#006e79'], fills: ['rgba(0,130,142,.1)'], labels: ['Cumulative savings'], fill: true },
  velocity: { colors: ['#0a6e9c'], fills: ['rgba(29,184,242,.1)'], labels: ['Velocity (SP/sprint)'], fill: false },
  costsp: { colors: ['#71609E'], fills: ['rgba(113,96,158,.1)'], labels: ['Cost / point'], fill: false },
};
export const legendOf = (k: MetricKey) => STYLE[k].labels.map((label, i) => ({ label, color: STYLE[k].colors[i]! }));

/** Chart of one metric revealed up to `month` (the rest is null), on the metric's full-horizon axis range. */
export function playbackChart(s: PlaybackSeries, key: MetricKey, month: number): ChartConfiguration {
  const st = STYLE[key], data = metricSeries(s, key), range = mpRange(data.flat());
  const labels = Array.from({ length: s.months + 1 }, (_, i) => (i === 0 ? 'AS-IS' : `M${i}`)), step = Math.max(1, Math.ceil(labels.length / 4));
  const pad = (a: number[]) => a.map((v, i) => (i <= month ? v : null));
  return {
    type: 'line',
    data: { labels, datasets: data.map((d, i) => ({ label: st.labels[i]!, data: pad(d), borderColor: st.colors[i]!, backgroundColor: st.fills[i]!,
      borderWidth: 3, tension: 0.35, fill: st.fill, pointRadius: 0, spanGaps: false, borderDash: key === 'fte' && i === 1 ? [6, 3] : [] })) as never },
    options: { animation: false, plugins: { legend: { display: false } },
      scales: { y: { min: range.min, max: range.max, title: { display: true, text: MP_META[key].yLabel } },
        x: { ticks: { callback: (_v, i) => (i % step === 0 ? labels[i] : '') } } } },
  };
}
