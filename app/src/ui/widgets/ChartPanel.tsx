import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { useEffect, useMemo, useRef } from 'react';
import { displaySpec } from '../display/store';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { ChartFallback } from '../errors/fallbacks';
import { chartText } from './chartData';
import { applyChartDefaults, themedConfig } from './chartTheme';

Chart.register(...registerables);

/**
 * Chart.js canvas bound to a config. The chart is created once and updated in place when `config` changes identity;
 * it is destroyed on unmount (the legacy app leaked charts across re-renders). `label` is the accessible name; the plotted data is also
 * offered as hidden text (one line per series) because the canvas itself is opaque to assistive technology. The display options (dark axis text,
 * colour-blind dashes / hatches, reduced motion) are applied here (chartTheme); a display change re-mounts the section, so the chart is rebuilt.
 */
export function ChartPanel(p: ChartProps) {
  const { label, height = 280 } = p;
  // one failed chart shows a note in its place, the section keeps rendering; a new config tries the chart again
  return (
    <ErrorBoundary scope="chart" where={label} resetKey={p.config} fallback={() => <ChartFallback label={label} height={height} />}>
      <ChartCanvas {...p} />
    </ErrorBoundary>
  );
}

interface ChartProps { config: ChartConfiguration; label: string; height?: number }
function ChartCanvas({ config, label, height = 280 }: ChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null), lines = useMemo(() => chartText(config), [config]);
  useEffect(() => {
    if (!canvas.current) return;
    chart.current?.destroy();
    const spec = displaySpec(), themed = themedConfig(config, spec);
    applyChartDefaults(spec);
    try { chart.current = new Chart(canvas.current, { ...themed, options: { responsive: true, maintainAspectRatio: false, ...themed.options } }); }
    catch { chart.current = null; }   // jsdom has no canvas: the table/figures around the chart still render
    return () => { chart.current?.destroy(); chart.current = null; };
  }, [config]);
  return (
    <div className="ac-chart" style={{ height }}>
      <canvas ref={canvas} role="img" aria-label={label} />
      {lines.length > 0 && <div className="ac-sr" data-chart-data role="group" aria-label={`${label} — data`}>{lines.map((l, i) => <p key={i}>{l}</p>)}</div>}
    </div>
  );
}
