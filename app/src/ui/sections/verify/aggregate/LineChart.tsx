import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { useTheme } from '@/ui/themeContext';
import type { TokenName } from '@/domain/theme';

const COLORS: readonly TokenName[] = ['chart-cat-3', 'chart-cat-2', 'chart-cat-1', 'chart-cat-4', 'chart-cat-5', 'chart-cat-6', 'chart-cat-7', 'chart-cat-8'];
export interface Line { label: string; data: number[]; thick?: boolean }

/** A line chart of calendar-month series (selection lines thick, products dashed); the data is also offered as hidden text by ChartPanel. */
export function LineChart({ labels, lines, label, yTitle, height = 300 }: { labels: string[]; lines: Line[]; label: string; yTitle: string; height?: number }) {
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'line',
    data: { labels, datasets: lines.map((s, i) => {
      const colour = tok(COLORS[i % COLORS.length]!);
      return { label: s.label, data: s.data, borderColor: colour, backgroundColor: colour, borderWidth: s.thick ? 3 : 1.5, pointRadius: 0, tension: 0.15,
        borderDash: s.thick ? [] : [5, 3] };
    }) },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, title: { display: true, text: yTitle } } } },
  }), [labels, lines, yTitle, tok]);
  return <ChartPanel config={config} label={label} height={height} />;
}
