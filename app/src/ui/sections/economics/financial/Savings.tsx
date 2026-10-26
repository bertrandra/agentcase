import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { yLabel } from '@/domain/economics';
import { fmt1, fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable } from '../GridTable';
import { useEconomics } from '../useEconomics';
import { savingsRamp } from './charts';

/** Human FTE freed and gross savings per year, with the savings ramp. */
export function Savings() {
  const { tok } = useTheme(), v = useEconomics(), s = v.series, e = v.H - 1, cfg = useMemo(() => savingsRamp(v, tok), [v, tok]);
  const rows = [
    { key: 'freed', label: 'Human FTE freed', cells: v.freed.map(fmt1) },
    { key: 'sav', label: 'Gross savings (vs AS-IS)', cells: s.savings.map(fmtE), bold: true },
  ];
  return (
    <Panel title="Benefits & Savings Realized">
      <GridTable head={['Metric', ...v.years.map((_, i) => yLabel(i + 1))]} rows={rows} />
      <ChartPanel config={cfg} label="Savings per year" height={260} />
      <Band items={[[`Freed FTE ${yLabel(v.H)}`, fmt1(v.freed[e] as number)], [`Savings ${yLabel(v.H)}`, fmtE(s.savings[e] as number)],
        [`Cumulative ${v.H}y`, fmtE(v.totalBenefit)]]} />
    </Panel>
  );
}
