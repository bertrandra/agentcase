import type { ChartConfiguration } from 'chart.js';
import type { LocRow, TargetTeam } from '@/domain/verifyA';

const grid = { color: 'rgba(0,0,0,.05)' };

/** AS-IS vs target share of effort by location. */
export function locChart(rows: LocRow[]): ChartConfiguration {
  return { type: 'bar', data: { labels: rows.map((r) => r.name), datasets: [
    { label: '% AS-IS', data: rows.map((r) => r.asisPct), backgroundColor: 'rgba(186,117,23,.7)' },
    { label: 'Target %', data: rows.map((r) => r.tgtPct), backgroundColor: 'rgba(99,153,34,.8)' }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { y: { title: { display: true, text: '% effort' }, grid } } } };
}

/** Headcount input -> target, stacked by pole. */
export function headcountChart(base: number, t: TargetTeam): ChartConfiguration {
  return { type: 'bar', data: { labels: ['Input (AS-IS)', 'Target Y3'], datasets: [
    { label: 'Dev/Prod', data: [base, t.devETP], backgroundColor: '#0a6e9c' },
    { label: 'Supervision', data: [0, t.supETP], backgroundColor: '#b04600' },
    { label: 'Agentic run', data: [0, t.runETP], backgroundColor: '#006e79' }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'FTE' }, grid } } } };
}
