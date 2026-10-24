import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { SetupLine } from '@/domain/tuneB/setup';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { eur } from '../../tuneB/fmt';
import { useTheme } from '@/ui/themeContext';
import type { TokenName } from '@/domain/theme';

const COLORS: readonly TokenName[] = ['secondary-600', 'info-700', 'teal-700', 'warning-600'];

/** Doughnut of the four setup lines. */
export function SetupChart({ lines }: { lines: SetupLine[] }) {
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'doughnut',
    data: { labels: ['Tooling', 'Training', 'Coaching', 'Governance'], datasets: [{ data: lines.map((l) => l.amount), backgroundColor: COLORS.map(tok), borderColor: tok('neutral-0'), borderWidth: 2 }] },
    options: { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (x) => `${x.label}: ${eur(x.parsed)}` } } } },
  }), [lines, tok]);
  return <ChartPanel config={config} label="Setup cost split" height={220} />;
}
