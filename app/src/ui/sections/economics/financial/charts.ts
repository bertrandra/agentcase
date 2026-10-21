import type { ChartConfiguration } from 'chart.js';
import { cashSteps, ftePoints, yearSeries, yLabel, type EconomicsView, type SavingsBreakdown } from '@/domain/economics';
import { yearLabels } from '../charts';

const k = (v: number) => Math.round(v / 1000);
const title = (text: string) => ({ display: true, text });
const yTitle = { y: { title: title('€ thousands') } };

/** Operating cost mix of the end year. */
export function costMix(v: EconomicsView): ChartConfiguration {
  const s = yearSeries(v.years), last = (a: number[]) => a[a.length - 1] ?? 0;
  return { type: 'doughnut', data: { labels: ['Human', 'Agent tokens', 'Infra', 'Agentic run'],
    datasets: [{ data: [last(s.team), last(s.token), last(s.infra), last(s.agentRun)], backgroundColor: ['#b04600', '#006e79', '#0a6e9c', '#0058AB'] }] },
  options: { plugins: { legend: { position: 'bottom' }, title: title(`${yLabel(v.H)} operating cost mix`) } } };
}

/** Savings per year (€ thousands). */
export function savingsRamp(v: EconomicsView): ChartConfiguration {
  return { type: 'line', data: { labels: yearLabels(v.H), datasets: [{ label: 'Savings', data: yearSeries(v.years).savings.map(k), borderColor: '#006e79',
    backgroundColor: 'rgba(99,153,34,0.12)', fill: true, tension: 0.3 }] }, options: { plugins: { legend: { display: false } }, scales: yTitle } };
}

/** Automation / agent cost / relocation stacked by year. */
export function decompBars(b: SavingsBreakdown): ChartConfiguration {
  const ds = (label: string, data: number[], backgroundColor: string) => ({ label, data, backgroundColor });
  return { type: 'bar', data: { labels: b.years.map((_, i) => `Year ${i + 1}`), datasets: [
    ds('Gross automation', b.years.map((y) => Math.round(y.grossAuto)), '#006e79'), ds('Agent operating cost', b.years.map((y) => -Math.round(y.agentCost)), '#8F3237'),
    ds('Relocation', b.years.map((y) => Math.round(y.relocation)), '#b04600')] },
  options: { scales: { x: { stacked: true }, y: { stacked: true, title: title('€ / year') } }, plugins: { legend: { position: 'bottom' }, title: title('Savings decomposition by year') } } };
}

/** Cumulative cash-flow after setup and each year; red while negative. */
export function plBars(v: EconomicsView): ChartConfiguration {
  const steps = cashSteps(yearSeries(v.years).savings, v.setup);
  return { type: 'bar', data: { labels: ['Setup', ...yearLabels(v.H)], datasets: [{ label: 'Cumulative net', data: steps.map(k), backgroundColor: steps.map((x) => (x < 0 ? '#b04600' : '#006e79')) }] },
    options: { plugins: { legend: { display: false }, title: title('Cumulative cash-flow (€ thousands) — crossover = payback') }, scales: yTitle } };
}

/** Human FTE falling, agent vFTE growing. */
export function fteShift(v: EconomicsView): ChartConfiguration {
  const pts = ftePoints(v);
  return { type: 'line', data: { labels: pts.map((p) => `M${p.month}`), datasets: [
    { label: 'Human FTE', data: pts.map((p) => p.human), borderColor: '#b04600', backgroundColor: 'rgba(186,117,23,0.10)', tension: 0.2 },
    { label: 'Agent vFTE', data: pts.map((p) => p.agent), borderColor: '#006e79', backgroundColor: 'rgba(99,153,34,0.10)', tension: 0.2 }] },
  options: { plugins: { legend: { position: 'bottom' } } } };
}
