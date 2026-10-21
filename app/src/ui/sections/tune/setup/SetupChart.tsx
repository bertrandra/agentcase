import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { SetupLine } from '@/domain/tuneB/setup';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { eur } from '../../tuneB/fmt';

const COLORS = ['#71609E', '#1DB8F2', '#00828E', '#BE4D00'];

/** Doughnut of the four setup lines. */
export function SetupChart({ lines }: { lines: SetupLine[] }) {
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'doughnut',
    data: { labels: ['Tooling', 'Training', 'Coaching', 'Governance'], datasets: [{ data: lines.map((l) => l.amount), backgroundColor: COLORS, borderColor: '#fff', borderWidth: 2 }] },
    options: { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (x) => `${x.label}: ${eur(x.parsed)}` } } } },
  }), [lines]);
  return <ChartPanel config={config} label="Setup cost split" height={220} />;
}
