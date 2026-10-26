// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import '@/ui/widgets/ChartPanel';   // registers the chart.js components the app uses

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
/** The source files that build a chart.js configuration. */
const chartFiles = walk('src').filter((f) => /\.tsx?$/.test(f) && /from 'chart\.js'/.test(readFileSync(f, 'utf8')));
const found = (re: RegExp): string[] => [...new Set(chartFiles.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(re)].map((m) => m[1]!)))].sort();
const CHART_TYPES = /\btype: '(bar|line|doughnut|pie|radar|scatter|bubble|polarArea)'/g;
const SCALE_TYPES = /\btype: '(linear|logarithmic|category|time|timeseries|radialLinear)'/g;

describe('chart.js registration (ChartPanel registers only what is used, not `registerables`)', () => {
  it('finds the chart builders', () => {
    expect(chartFiles.length).toBeGreaterThan(15);
    expect(found(CHART_TYPES)).toEqual(['bar', 'doughnut', 'line', 'radar']);
  });
  it('every chart type of src has its controller and the elements and default scales it draws with', () => {
    for (const t of found(CHART_TYPES)) {
      const ctrl = Chart.registry.getController(t) as unknown as { defaults: { datasetElementType?: string; dataElementType?: string } };
      const elements = [ctrl.defaults.datasetElementType, ctrl.defaults.dataElementType].filter((x): x is string => !!x);
      for (const el of elements) expect(() => Chart.registry.getElement(el)).not.toThrow();
      const scales = (Chart.overrides[t as keyof typeof Chart.overrides] as { scales?: Record<string, { type?: string }> }).scales ?? {};
      for (const s of Object.values(scales)) if (s.type) expect(() => Chart.registry.getScale(s.type!)).not.toThrow();
    }
  });
  it('every scale type named in src is registered', () => {
    for (const t of found(SCALE_TYPES)) expect(() => Chart.registry.getScale(t)).not.toThrow();
  });
  it('the plugins the options use are registered (fill, legend, tooltip, title), the unused ones are not', () => {
    for (const p of ['filler', 'legend', 'tooltip', 'title']) expect(Chart.registry.plugins.get(p)).toBeTruthy();
    for (const p of ['colors', 'decimation', 'subtitle']) expect(Chart.registry.plugins.get(p)).toBeUndefined();
    expect(() => Chart.registry.getController('bubble')).toThrow();
  });
});
