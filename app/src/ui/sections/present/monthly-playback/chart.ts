import type { ChartConfiguration } from 'chart.js';
import { metricSeries, mpRange, MP_META, type MetricKey, type PlaybackSeries } from '@/domain/pdc/playback';
import { themedList } from '@/domain/theme';

const STYLE: Record<MetricKey, { colors: readonly string[]; fills: readonly string[]; labels: string[]; fill: boolean }> = {
  fte: { colors: themedList(['warning-600', 'teal-700']), fills: themedList(['warning-575-a12', 'teal-600-a12']), labels: ['Human FTE', 'Agent vFTE'], fill: true },
  cost: { colors: themedList(['primary-700']), fills: themedList(['primary-700-a10']), labels: ['Monthly run cost'], fill: true },
  savings: { colors: themedList(['teal-700']), fills: themedList(['teal-600-a10']), labels: ['Cumulative savings'], fill: true },
  velocity: { colors: themedList(['info-700']), fills: themedList(['info-375-a10']), labels: ['Velocity (SP/sprint)'], fill: false },
  costsp: { colors: themedList(['secondary-600']), fills: themedList(['secondary-600-a10']), labels: ['Cost / point'], fill: false },
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
