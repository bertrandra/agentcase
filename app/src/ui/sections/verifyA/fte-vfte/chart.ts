import type { ChartConfiguration, Chart } from 'chart.js';
import type { FteSeries } from '@/domain/verifyA/fteVfte';
import type { TokenName } from '@/domain/theme';
import type { Tok } from '@/domain/theme/resolve';

const LEVELS: Record<string, TokenName> = { L1: 'slate-700', L2: 'chart-cat-5', L3: 'chart-cat-2', L4: 'chart-cat-1' };

/** Human FTE falling, agent vFTE growing, the flat total, and a dashed vertical marker where the adoption curve crosses each L-threshold. */
export function fteChart(s: FteSeries, tok: Tok): ChartConfiguration {
  const COL = (lvl: string): string => tok(LEVELS[lvl] ?? 'neutral-700');
  const levels = {
    id: 'fvLevels',
    afterDatasetsDraw(chart: Chart) {
      try {
        const xs = chart.scales.x, a = chart.chartArea, cx = chart.ctx, n = s.labels.length,
          px = (i: number) => (xs as { getPixelForValue(v: number): number }).getPixelForValue(i);
        for (const b of s.marks) {
          const lo = Math.min(n - 1, Math.floor(b.at)), hi = Math.min(n - 1, Math.ceil(b.at)), x = px(lo) + (b.at - Math.floor(b.at)) * (px(hi) - px(lo));
          cx.save(); cx.strokeStyle = COL(b.lvl); cx.lineWidth = 1.3; cx.setLineDash([4, 3]); cx.globalAlpha = 0.6;
          cx.beginPath(); cx.moveTo(x, a.top); cx.lineTo(x, a.bottom); cx.stroke();
          cx.globalAlpha = 1; cx.setLineDash([]); cx.fillStyle = COL(b.lvl); cx.font = '700 11px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'top';
          cx.fillText(b.lvl, x, a.top + 2); cx.restore();
        }
      } catch { /* no canvas */ }
    },
  };
  return {
    type: 'line',
    data: { labels: s.labels, datasets: [
      { label: 'Total effort (FTE-eq) = baseline', data: s.base, borderColor: tok('neutral-700'), borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0,
        fill: false },
      { label: 'Human FTE', data: s.human, borderColor: tok('chart-cat-3'), backgroundColor: tok('warning-500-a15'), borderWidth: 3, tension: 0.4, fill: true,
        pointRadius: 2 },
      { label: 'Agent vFTE', data: s.agent, borderColor: tok('chart-cat-2'), backgroundColor: tok('success-500-a15'), borderWidth: 3, tension: 0.4,
        fill: true, pointRadius: 2 },
    ] },
    options: { plugins: { legend: { position: 'top' } },
      scales: { y: { min: 0, max: s.max, title: { display: true, text: 'FTE/vFTE' }, grid: { color: tok('chart-grid') } },
        x: { title: { display: true, text: 'Month' } } } },
    plugins: [levels],
  };
}
