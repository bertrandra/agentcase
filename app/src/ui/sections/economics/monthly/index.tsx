import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { activeCurveOf } from '@/domain/economics';
import { useCtx } from '@/store/hooks';
import { fmt1, fmtE, pct0 } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { monthlyMix } from '../charts';
import { useEconomics } from '../useEconomics';

const help = (
  <>
    <p>The month-by-month trajectory showing how the ramp translates into cost, saving and cumulative cash-flow, including the break-even point.</p>
    <p>Net(m) = (Baseline/12 − run costs) − setup spread(m); Cumulative(m) = Σ Net up to month m. Months with setup spend carry it in the Setup column, so early cumulative is negative.</p>
  </>
);
const sign = (x: number) => ({ color: x >= 0 ? 'var(--ac-teal-725)' : 'var(--ac-warning-595)' });

/** Monthly detail — one row per month of the horizon, chart decimated for long horizons. */
export default function MonthlySection() {
  const { tok } = useTheme(), v = useEconomics(), curve = activeCurveOf(useCtx()), cfg = useMemo(() => monthlyMix(v, tok), [v, tok]);
  const note = /^legacy/.test(curve)
    ? 'The ramp steps at months 12 and 24: this is the exact annual disaggregation, not a smoothing artefact. The twelve months of each year sum to that year’s modelled value, which is why payback and NPV read straight off this table.'
    : `The ramp follows the active adoption curve (${curve.replace(/\.default$/, '')}) month by month. The twelve months of each year sum to that year’s modelled value, which is why payback and NPV read straight off this table.`;
  return (
    <SectionFrame title="Monthly detail (36 / 60 months)" help={help}
      result={<>
        <ChartPanel config={cfg} label="Monthly total cost, saving and cumulative cash-flow" height={300} />
        <p className="ac-muted" data-testid="monthly-curve-note">{note}</p>
        <DataTable caption="Monthly table" rows={v.months} rowKey={(r) => String(r.mo)} columns={[
          { key: 'm', header: 'Month', render: (r) => `M${r.mo}` },
          { key: 'r', header: 'Ramp', align: 'center', render: (r) => pct0(r.ramp) },
          { key: 'h', header: 'Human FTE', align: 'right', render: (r) => fmt1(r.humanETP) },
          { key: 'a', header: 'Agent vFTE', align: 'right', render: (r) => fmt1(r.agentVfte) },
          { key: 't', header: 'Team cost', align: 'right', render: (r) => fmtE(r.teamCost) },
          { key: 'k', header: 'Tokens', align: 'right', render: (r) => fmtE(r.tokenCost) },
          { key: 's', header: 'Setup', align: 'right', render: (r) => (r.setupSpend > 0 ? fmtE(r.setupSpend) : '—') },
          { key: 'tot', header: 'Total cost', align: 'right', render: (r) => fmtE(r.total) },
          { key: 'sv', header: 'Saving', align: 'right', render: (r) => <span style={sign(r.sav)}>{fmtE(r.sav)}</span> },
          { key: 'c', header: 'Cumulative', align: 'right', render: (r) => <b style={sign(r.cum)}>{fmtE(r.cum)}</b> },
        ]} />
      </>} />
  );
}
