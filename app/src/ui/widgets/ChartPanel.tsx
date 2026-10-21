import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { useEffect, useMemo, useRef } from 'react';
import { chartText } from './chartData';

Chart.register(...registerables);

/**
 * Chart.js canvas bound to a config. The chart is created once and updated in place when `config` changes identity;
 * it is destroyed on unmount (the legacy app leaked charts across re-renders). `label` is the accessible name; the plotted data is also
 * offered as hidden text (one line per series) because the canvas itself is opaque to assistive technology.
 */
export function ChartPanel({ config, label, height = 280 }: { config: ChartConfiguration; label: string; height?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null), lines = useMemo(() => chartText(config), [config]);
  useEffect(() => {
    if (!canvas.current) return;
    chart.current?.destroy();
    try { chart.current = new Chart(canvas.current, { ...config, options: { responsive: true, maintainAspectRatio: false, ...config.options } }); }
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
