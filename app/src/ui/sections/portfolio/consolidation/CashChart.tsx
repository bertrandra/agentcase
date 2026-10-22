import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { ChartView } from '@/domain/portfolio';
import { ChartPanel } from '@/ui/widgets/ChartPanel';

const COLORS = ['#0058AB', '#006e79', '#b04600', '#71609E', '#0a6e9c', '#8a6d00', '#a02b5a', '#4f7d2a'];

/** Cumulative cash by calendar month: the portfolio (thick) and one line per wave. The data is also offered as hidden text by ChartPanel. */
export function CashChart({ chart }: { chart: ChartView }) {
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'line',
    data: {
      labels: chart.labels,
      datasets: chart.series.map((s, i) => ({
        label: s.label, data: s.data, borderColor: COLORS[i % COLORS.length], backgroundColor: COLORS[i % COLORS.length], borderWidth: i === 0 ? 3 : 1.5, pointRadius: 0, tension: 0.15,
        borderDash: i === 0 ? [] : [5, 3],
      })),
    },
    options: {
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: €${Math.round(x.parsed.y / 1000).toLocaleString('en-US')}k` } } },
      scales: { y: { title: { display: true, text: 'Trésorerie cumulée (€)' } } },
    },
  }), [chart]);
  return <ChartPanel config={config} label="Trésorerie cumulée par mois calendaire : portefeuille et vagues" height={300} />;
}
