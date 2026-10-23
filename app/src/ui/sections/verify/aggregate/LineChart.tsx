import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { tok, themedList } from '@/domain/theme';

const COLORS = themedList(['warning-600', 'teal-700', 'primary-700', 'secondary-600', 'info-700', 'warning-590', 'danger-710', 'success-600']);
export interface Line { label: string; data: number[]; thick?: boolean }

/** A line chart of calendar-month series (selection lines thick, products dashed); the data is also offered as hidden text by ChartPanel. */
export function LineChart({ labels, lines, label, yTitle, height = 300 }: { labels: string[]; lines: Line[]; label: string; yTitle: string; height?: number }) {
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'line',
    data: { labels, datasets: lines.map((s, i) => ({ label: s.label, data: s.data, borderColor: COLORS[i % COLORS.length], backgroundColor: COLORS[i % COLORS.length], borderWidth: s.thick ? 3 : 1.5, pointRadius: 0, tension: 0.15, borderDash: s.thick ? [] : [5, 3] })) },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, title: { display: true, text: yTitle } } } },
  }), [labels, lines, yTitle]);
  return <ChartPanel config={config} label={label} height={height} />;
}
