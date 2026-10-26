import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { tickK } from '@/ui/economicsFormat';
import { Callout } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { useTheme } from '@/ui/themeContext';
import type { TokenName } from '@/domain/theme';

const COLORS: readonly TokenName[] = ['primary-950-a80', 'success-500-a80', 'warning-500-a80', 'secondary-575-a70', 'teal-700-a70'];

/** What the figures of an aggregate view leave out (products with no wave, or archived): the same note on every result section. */
export function ExcludedNote({ excluded }: { excluded: { name: string; archived: boolean }[] }) {
  if (!excluded.length) return null;
  return <Callout kind="blue">Excluded from the figures (no wave, or
    archived): {excluded.map((e) => `${e.name}${e.archived ? ' (archived)' : ''}`).join(', ')}.</Callout>;
}

export interface BarSeries { label: string; data: number[] }
/** Stacked (or grouped) bars of already computed series, one bar per label; an optional line series is drawn on top. */
export function Bars({ labels, series, label, stacked = true, line,
  yTitle = '€' }: { labels: string[]; series: BarSeries[]; label: string; stacked?: boolean; line?: BarSeries; yTitle?: string }) {
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'bar',
    data: { labels, datasets: [
      ...series.map((s, i) => ({ type: 'bar' as const, label: s.label, data: s.data, backgroundColor: tok(COLORS[i % COLORS.length]!), yAxisID: 'y' })),
      ...(line ? [{ type: 'line' as const, label: line.label, data: line.data, borderColor: tok('primary-700'), borderWidth: 3, pointRadius: 0, tension: 0.2,
        yAxisID: 'y' }] : []),
    ] },
    options: { plugins: { legend: { position: 'top' } },
      scales: { x: { stacked, ticks: { maxTicksLimit: 20 } }, y: { stacked, title: { display: true, text: yTitle }, ticks: { callback: tickK } } } },
  }), [labels, series, line, stacked, yTitle, tok]);
  return <ChartPanel config={config} label={label} height={280} />;
}
