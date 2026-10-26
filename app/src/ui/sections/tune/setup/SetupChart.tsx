import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { SetupLine } from '@/domain/tuneB/setup';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { eur } from '../../tuneB/fmt';
import { useTheme } from '@/ui/themeContext';
import type { TokenName } from '@/domain/theme';

const COLORS: Record<SetupLine['id'], TokenName> = {
  tooling: 'secondary-600', training: 'info-700', coaching: 'teal-700', governance: 'warning-600', change: 'chart-cat-3', knowledge: 'chart-cat-5',
};

/** Doughnut of the setup lines (the four editable ones, plus the HRI change cost and the hub setup when those modules are on). */
export function SetupChart({ lines }: { lines: SetupLine[] }) {
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'doughnut',
    data: {
      labels: lines.map((l) => (l.input ? (l.label.split(' ')[0] as string) : l.label)),
      datasets: [{ data: lines.map((l) => l.amount), backgroundColor: lines.map((l) => tok(COLORS[l.id])), borderColor: tok('neutral-0'), borderWidth: 2 }],
    },
    options: { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (x) => `${x.label}: ${eur(x.parsed)}` } } } },
  }), [lines, tok]);
  return <ChartPanel config={config} label="Setup cost split" height={220} />;
}
