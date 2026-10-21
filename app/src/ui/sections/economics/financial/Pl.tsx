import { useMemo } from 'react';
import { avg, fmtPayback, fmtRoiPct, sum, yearSeries, yLabel } from '@/domain/economics';
import { fmtE, fmtParen } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable } from '../GridTable';
import { useEconomics } from '../useEconomics';
import { plBars } from './charts';

/** P&L and cash flow: setup, baseline, to-be cost, savings, net and cumulative per year. */
export function Pl() {
  const v = useEconomics(), s = yearSeries(v.years), cfg = useMemo(() => plBars(v), [v]);
  const dash = v.years.slice(1).map(() => '—'), baseline = v.years.map(() => v.baselineRun);
  // The legacy "Cumulative" column of the baseline / to-be / savings rows holds the per-year average (kept as is); Net and the last row are true cumulatives.
  const avgRow = (key: string, label: string, a: number[]) => ({ key, label, cells: [...a.map(fmtE), fmtE(avg(a))] });
  const net = s.savings.map((x, i) => x - (i === 0 ? v.setup : 0));
  const rows = [
    { key: 'setup', label: 'Setup investment', cells: [`(${fmtE(v.setup)})`, ...dash, `(${fmtE(v.setup)})`], bold: true },
    avgRow('base', 'AS-IS baseline run', baseline), avgRow('tobe', 'TO-BE operating cost', s.run), avgRow('sav', 'Gross savings', s.savings),
    { key: 'net', label: 'Net (savings − setup)', cells: [...net.map(fmtParen), fmtE(sum(s.savings) - v.setup)], bold: true, rule: true },
    { key: 'cum', label: 'Cumulative cash-flow', cells: [...v.cumulative.map(fmtParen), ''] },
  ];
  return (
    <Panel title={`${v.H}-Year P&L & Cash Flow`}>
      <GridTable head={['Line', ...v.years.map((_, i) => `${yLabel(i + 1)} (€)`), 'Cumulative (€)']} rows={rows} />
      <ChartPanel config={cfg} label="Cumulative cash-flow after setup and each year" height={260} />
      <Band items={[[`${v.H}-yr ROI (net)`, fmtRoiPct(v.roi)], [`Net profit ${v.H}y`, fmtE(v.net)], ['Payback', fmtPayback(v.payback, v.m.horizon * 12)]]} />
    </Panel>
  );
}
