import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { fmtPayback, fmtRoiPct, yLabel } from '@/domain/economics';
import { fmtK } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { cashflowLine } from '../charts';
import { useEconomics } from '../useEconomics';
import { Reco } from './Reco';

/** ROI & verdict strip: headline band, cumulative cash-flow (J-curve), year table, recommendation and the ROI walk-through. */
export function Verdict() {
  const { tok } = useTheme(), v = useEconomics(), cfg = useMemo(() => cashflowLine(v, tok), [v, tok]);
  const items: [string, string][] = [
    ['Investment', fmtK(v.setup)], [`Benefits ${v.H}y`, fmtK(v.totalBenefit)], ['Profit net', fmtK(v.net)], [`ROI (net, ${v.H}y)`, fmtRoiPct(v.roi)],
    ['Payback', fmtPayback(v.paybackShown, v.months.length)], [`NPV @${Math.round(v.npvRate * 100)}%`, fmtK(v.npv)],
  ];
  return (
    <Panel title={`ROI & ${v.H}-year verdict`}>
      <Band items={items} tone="teal" />
      <ChartPanel config={cfg} label="Cumulative cash-flow by month" height={290} />
      <DataTable rows={v.years} rowKey={(y) => String(y.yearIndex)} columns={[
        { key: 'y', header: 'Year', render: (_y, i) => <strong>{yLabel(i + 1)}</strong> },
        { key: 'set', header: 'Setup', align: 'right', render: (y) => (y.yearIndex === 1 || y.setupCost > 0 ? fmtK(y.setupCost) : '—') },
        { key: 'run', header: 'Actual run', align: 'right', render: (y) => fmtK(y.totalRunCost) },
        { key: 'base', header: 'AS-IS baseline', align: 'right', render: () => fmtK(v.baselineRun) },
        { key: 'ben', header: 'Benefit', align: 'right', render: (y) => fmtK(y.savings) },
        { key: 'net', header: 'Net', align: 'right', render: (y) => <b>{fmtK(y.netAfterSetup)}</b> },
        { key: 'cum', header: 'Cumulative', align: 'right', render: (y) => <b>{fmtK(y.cumulativeCashFlowEnd)}</b> },
      ]} />
      <Reco v={v} />
    </Panel>
  );
}
