import type { ChartConfiguration } from 'chart.js';

/** Test double for ChartPanel (jsdom has no canvas): renders the accessible canvas and exposes the chart's labels / series for assertions. */
export function ChartPanel({ config, label }: { config: ChartConfiguration; label: string; height?: number }) {
  const sets = (config.data.datasets ?? []).map((d) => `${d.label ?? ''}:${(d.data as unknown[]).length}`).join(',');
  return <canvas role="img" aria-label={label} data-points={(config.data.labels ?? []).length} data-series={sets} />;
}
