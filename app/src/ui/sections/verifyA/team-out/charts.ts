import type { ChartConfiguration } from 'chart.js';
import type { LocRow, TargetTeam } from '@/domain/verifyA';
import type { Tok } from '@/domain/theme/resolve';

const grid = (tok: Tok) => ({ color: tok('chart-grid') });

/** AS-IS vs target share of effort by location. */
export function locChart(rows: LocRow[], tok: Tok): ChartConfiguration {
  return { type: 'bar', data: { labels: rows.map((r) => r.name), datasets: [
    { label: '% AS-IS', data: rows.map((r) => r.asisPct), backgroundColor: tok('warning-500-a70') },
    { label: 'Target %', data: rows.map((r) => r.tgtPct), backgroundColor: tok('success-500-a80') }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { y: { title: { display: true, text: '% effort' }, grid: grid(tok) } } } };
}

/** Headcount input -> target, stacked by pole. */
export function headcountChart(base: number, t: TargetTeam, tok: Tok): ChartConfiguration {
  return { type: 'bar', data: { labels: ['Input (AS-IS)', 'Target Y3'], datasets: [
    { label: 'Dev/Prod', data: [base, t.devETP], backgroundColor: tok('chart-cat-5') },
    { label: 'Supervision', data: [0, t.supETP], backgroundColor: tok('chart-cat-3') },
    { label: 'Agentic run', data: [0, t.runETP], backgroundColor: tok('chart-cat-2') }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'FTE' }, grid: grid(tok) } } } };
}
