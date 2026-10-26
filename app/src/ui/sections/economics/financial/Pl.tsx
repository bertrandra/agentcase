import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { fmtPayback, fmtRoiPct, yLabel } from '@/domain/economics';
import { fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable } from '../GridTable';
import { useEconomics } from '../useEconomics';
import { plBars } from './charts';

/** P&L and cash flow: setup, baseline, to-be cost, savings, net and cumulative per year. */
export function Pl() {
  const { tok } = useTheme(), v = useEconomics(), s = v.series, cfg = useMemo(() => plBars(v, tok), [v, tok]);
  const dash = v.years.slice(1).map(() => '—'), baseline = v.years.map(() => v.baselineRun);
  // The legacy "Cumulative" column of the baseline / to-be / savings rows holds the per-year average (kept as is); Net and the last row are true cumulatives.
  const avgRow = (key: string, label: string, a: number[], mean: number) => ({ key, label, cells: [...a.map(fmtE), fmtE(mean)] });
  const rows = [
    { key: 'setup', label: 'Setup investment', cells: [fmtE(-v.setup), ...dash, fmtE(-v.setup)], bold: true },
    avgRow('base', 'AS-IS baseline run', baseline, v.baselineRun), avgRow('tobe', 'TO-BE operating cost', s.run, v.avgOf.run),
    avgRow('sav', 'Gross savings', s.savings, v.avgOf.savings),
    { key: 'net', label: 'Net (savings − setup)', cells: [...v.yearNet.map(fmtE), fmtE(v.net)], bold: true, rule: true },
    { key: 'cum', label: 'Cumulative cash-flow', cells: [...v.cumulative.map(fmtE), ''] },
  ];
  return (
    <Panel title={`${v.H}-Year P&L & Cash Flow`}>
      <GridTable head={['Line', ...v.years.map((_, i) => `${yLabel(i + 1)} (€)`), 'Cumulative (€)']} rows={rows} />
      <ChartPanel config={cfg} label="Cumulative cash-flow after setup and each year" height={260} />
      <Band items={[[`${v.H}-yr ROI (net)`, fmtRoiPct(v.roi)], [`Net profit ${v.H}y`, fmtE(v.net)],
        ['Payback', fmtPayback(v.paybackShown, v.m.horizon * 12)]]} />
    </Panel>
  );
}
