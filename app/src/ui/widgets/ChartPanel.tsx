import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend, LinearScale, LineController, LineElement, PointElement,
  RadarController, RadialLinearScale, Title, Tooltip, type ChartConfiguration,
} from 'chart.js';
import { useEffect, useMemo, useRef } from 'react';
import type { Theme } from '@/domain/theme/resolve';
import { cssVars, px } from '../cssVars';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { ChartFallback } from '../errors/fallbacks';
import { useTheme } from '../themeContext';
import { chartText } from './chartData';
import { applyChartDefaults, themedConfig } from './chartTheme';

// Only what the app draws (tests/ui/chart-registry.test.ts checks every chart type and scale of src against it): bar, line, doughnut and radar charts
// (mixed bar + line datasets), category / linear / radial scales, the area fill, legend, tooltip and title. Not registered: pie, polar area, bubble,
// scatter, the logarithmic and time scales, decimation, subtitle and the Colors plugin (every dataset sets its own colours, so it never applied).
Chart.register(BarController, LineController, DoughnutController, RadarController, BarElement, LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale, RadialLinearScale, Filler, Legend, Tooltip, Title);

/**
 * Chart.js canvas bound to a config. The chart is created when its config changes identity (an edit) and destroyed on unmount (the legacy app leaked
 * charts across re-renders). `label` is the accessible name; the plotted data is also offered as hidden text (one line per series) because the canvas
 * itself is opaque to assistive technology. The display options (dark axis text, colour-blind dashes / hatches, reduced motion) are applied here
 * (chartTheme) from the theme in effect: a theme or display change updates the SAME chart in place (`chart.options = …; chart.update('none')`), so
 * nothing around it re-mounts.
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
const full = (c: ChartConfiguration): ChartConfiguration =>
  ({ ...c, options: { responsive: true, maintainAspectRatio: false, ...c.options } }) as ChartConfiguration;

/** Bring `chart` to `config` under `theme`: in place when only the theme moved (same chart type), else a new chart. Returns the chart in effect. */
export function syncChart(canvas: HTMLCanvasElement, chart: Chart | null, config: ChartConfiguration, theme: Theme, themeOnly: boolean): Chart | null {
  const next = full(themedConfig(config, theme));
  applyChartDefaults(theme);
  if (chart && themeOnly && (chart.config as { type?: string }).type === next.type) {
    chart.data = next.data;
    chart.options = next.options ?? {};
    chart.update('none');
    return chart;
  }
  chart?.destroy();
  try { return new Chart(canvas, next); } catch { return null; }   // jsdom has no canvas: the table/figures around the chart still render
}

function ChartCanvas({ config, label, height = 280 }: ChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null), theme = useTheme();
  const chart = useRef<Chart | null>(null), last = useRef<{ config: ChartConfiguration; theme: Theme } | null>(null);
  const lines = useMemo(() => chartText(config), [config]);
  useEffect(() => {
    if (!canvas.current) return;
    // a new config from an edit rebuilds the chart (as before); a theme / display change alone updates it in place
    const prev = last.current, themeOnly = !!prev && prev.theme !== theme && (prev.config === config || sameData(prev.config, config));
    chart.current = syncChart(canvas.current, chart.current, config, theme, themeOnly);
    last.current = { config, theme };
  }, [config, theme]);
  useEffect(() => () => { chart.current?.destroy(); chart.current = null; }, []);
  return (
    <div className="ac-chart" style={cssVars({ '--dyn-chart-h': px(height) })}>{/* dynamic: each chart has its own height */}
      <canvas ref={canvas} role="img" aria-label={label} />
      {lines.length > 0 && <div className="ac-sr" data-chart-data role="group" aria-label={`${label} — data`}>{lines.map((l, i) => <p key={i}>{l}</p>)}</div>}
    </div>
  );
}

/** Same figures (labels and values of every series): a config rebuilt for a new theme only, so its chart can be updated in place. */
function sameData(a: ChartConfiguration, b: ChartConfiguration): boolean {
  const key = (c: ChartConfiguration) => JSON.stringify({ t: c.type, l: c.data?.labels, d: (c.data?.datasets ?? []).map((d) => [d.label, d.data]) });
  try { return key(a) === key(b); } catch { return false; }
}
