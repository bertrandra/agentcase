import type { ChartConfiguration } from 'chart.js';
import type { LocRow, TargetTeam } from '@/domain/verifyA';
import { tok } from '@/domain/theme';

const grid = { get color() { return tok('neutral-1000-a5'); } };

/** AS-IS vs target share of effort by location. */
export function locChart(rows: LocRow[]): ChartConfiguration {
  return { type: 'bar', data: { labels: rows.map((r) => r.name), datasets: [
    { label: '% AS-IS', data: rows.map((r) => r.asisPct), backgroundColor: tok('warning-500-a70') },
    { label: 'Target %', data: rows.map((r) => r.tgtPct), backgroundColor: tok('success-500-a80') }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { y: { title: { display: true, text: '% effort' }, grid } } } };
}

/** Headcount input -> target, stacked by pole. */
export function headcountChart(base: number, t: TargetTeam): ChartConfiguration {
  return { type: 'bar', data: { labels: ['Input (AS-IS)', 'Target Y3'], datasets: [
    { label: 'Dev/Prod', data: [base, t.devETP], backgroundColor: tok('info-700') },
    { label: 'Supervision', data: [0, t.supETP], backgroundColor: tok('warning-600') },
    { label: 'Agentic run', data: [0, t.runETP], backgroundColor: tok('teal-700') }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'FTE' }, grid } } } };
}
