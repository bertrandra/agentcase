import type { ChartConfiguration } from 'chart.js';
import type { complianceView, execView, kpiView, productivityView, qualityAnchorView, velocityView } from '@/domain/verifyB';
import { alpha, tok, type TokenName } from '@/domain/theme';

const GRID = { get color() { return tok('chart-grid'); } };
const LEGEND = { legend: { position: 'top' as const } };
type V<F extends (...a: never[]) => unknown> = ReturnType<F>;

/** Index chart (AS-IS = 100) of the KPI scorecard. */
export function kpiChart(v: V<typeof kpiView>): ChartConfiguration {
  return { type: 'bar', data: { labels: ['FTE effort', 'Run cost', 'Lead time', 'Run idx', 'Bugs', 'Test cov.', 'Velocity'], datasets: [
    { label: 'AS-IS (100)', data: [100, 100, 100, 100, 100, 100, 100], backgroundColor: tok('warning-500-a70') },
    { label: `TO-BE ${v.endL}`, data: v.chart, backgroundColor: tok('success-500-a80') }] },
  options: { plugins: LEGEND, scales: { y: { title: { display: true, text: 'Index (AS-IS=100)' }, grid: GRID } } } };
}

/** Sprint velocity by year (flat per sprint). */
export function execChart(v: V<typeof execView>): ChartConfiguration {
  const style: Record<string, object> = { 'AS-IS': { borderColor: tok('warning-600'), borderWidth: 3 }, Y1: { borderColor: tok('warning-325'), borderWidth: 2, borderDash: [5, 5] }, Y2: { borderColor: tok('success-400'), borderWidth: 2 } };
  return { type: 'line', data: { labels: Array.from({ length: 8 }, (_, i) => `Sprint ${i + 1}`),
    datasets: v.sprints.map(([label, value]) => ({ label, data: Array<number>(8).fill(value), ...(style[label] ?? { borderColor: tok('teal-700'), borderWidth: 3 }) })) },
  options: { plugins: LEGEND, scales: { y: { title: { display: true, text: 'SP/sprint' }, grid: GRID } } } };
}

/** Throughput per engineer per month, AS-IS and each year. */
export function productivityChart(v: V<typeof productivityView>): ChartConfiguration {
  const ds = (label: string, data: number[], backgroundColor: string) => ({ label, data, backgroundColor });
  return { type: 'bar', data: { labels: v.rows.map((r) => r.label), datasets: [ds('AS-IS', v.rows.map((r) => r.asis), tok('warning-600')), ds('Y1', v.rows.map((r) => r.y1), tok('warning-325')),
    ds('Y2', v.rows.map((r) => r.y2), tok('success-400')), ds(v.endL, v.rows.map((r) => r.y3), tok('teal-700'))] }, options: { plugins: LEGEND, scales: { y: { grid: GRID } } } };
}

/** Velocity line Y0 → horizon end. */
export function velocityChart(v: V<typeof velocityView>): ChartConfiguration {
  return { type: 'line', data: { labels: ['Y0', 'Y1', 'Y2', v.endL], datasets: [{ label: 'Velocity SP/sprint', data: v.velocity, borderColor: tok('teal-700'), borderWidth: 3, tension: 0.3 }] },
    options: { plugins: LEGEND, scales: { y: { title: { display: true, text: 'SP/sprint' }, grid: GRID } } } };
}

/** Quality radar AS-IS vs TO-BE. */
export function qualityRadar(v: V<typeof qualityAnchorView>): ChartConfiguration {
  return { type: 'radar', data: { labels: ['Low bugs', 'Test cov.', 'Review speed', 'Low leakage', 'Doc up-to-date', 'Security', 'Satisfaction'], datasets: [
    { label: 'AS-IS', data: v.radarAsis, borderColor: tok('warning-600'), backgroundColor: tok('warning-500-a15'), borderWidth: 2 },
    { label: `TO-BE ${v.endL}`, data: v.radarTobe, borderColor: tok('teal-700'), backgroundColor: tok('success-500-a15'), borderWidth: 2 }] },
  options: { plugins: LEGEND, scales: { r: { min: 0, max: 100, pointLabels: { font: { size: 10 } } } } } };
}

/** Max automatable vs glass ceiling per sector (the selected sector is highlighted). */
export function complianceChart(v: V<typeof complianceView>): ChartConfiguration {
  const shade = (c: TokenName) => v.sectors.map((s) => alpha(c, s.selected ? '.9' : '.45'));
  return { type: 'bar', data: { labels: v.sectors.map((s) => s.name), datasets: [
    { label: 'Max automatable %', data: v.sectors.map((s) => s.max), backgroundColor: shade('success-500') },
    { label: 'Glass ceiling %', data: v.sectors.map((s) => s.ceiling), backgroundColor: shade('warning-500') }] },
  options: { plugins: LEGEND, scales: { x: { stacked: true }, y: { stacked: true, max: 100, grid: GRID } } } };
}
