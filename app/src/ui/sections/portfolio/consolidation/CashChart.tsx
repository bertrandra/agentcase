import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { ChartView } from '@/domain/portfolio';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { useTheme } from '@/ui/themeContext';
import type { TokenName } from '@/domain/theme';

const COLORS: readonly TokenName[] = ['chart-cat-1', 'chart-cat-2', 'chart-cat-3', 'chart-cat-4', 'chart-cat-5', 'chart-cat-6', 'chart-cat-7', 'chart-cat-8'];

/** Cumulative cash by calendar month: the portfolio (thick) and one line per wave. The data is also offered as hidden text by ChartPanel. */
export function CashChart({ chart, label = 'Cumulative cash by calendar month: portfolio and waves' }: { chart: ChartView; label?: string }) {
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'line',
    data: {
      labels: chart.labels,
      datasets: chart.series.map((s, i) => ({
        label: s.label, data: s.data, borderColor: tok(COLORS[i % COLORS.length]!), backgroundColor: tok(COLORS[i % COLORS.length]!), borderWidth: i === 0 ? 3
        : 1.5, pointRadius: 0, tension: 0.15,
        borderDash: i === 0 ? [] : [5, 3],
      })),
    },
    options: {
      plugins: { legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (x) => `${x.dataset.label}: €${Math.round(x.parsed.y / 1000).toLocaleString('en-US')}k` } } },
      scales: { y: { title: { display: true, text: 'Cumulative cash (€)' } } },
    },
  }), [chart, tok]);
  return <ChartPanel config={config} label={label} height={300} />;
}
