import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { histogramBins, pNegTone, STRONG_CORRELATION } from '@/domain/stress';
import type { SimRun } from '@/store/simulation';
import { Callout, Stat, StatRow } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { fmtEur } from '../fmt';
import { StaleBanner } from '../useSimulation';
import { useTheme } from '@/ui/themeContext';
import type { Tok } from '@/domain/theme/resolve';

/** Histogram of the net-benefit distribution (`histogramBins`); bins entirely below zero are red. */
export function histogram(o: number[], tok: Tok): ChartConfiguration {
  const b = histogramBins(o);
  return { type: 'bar', data: { labels: b.map((x) => `${Math.round(x.center / 1000)}k`),
    datasets: [{ label: 'Frequency', data: b.map((x) => x.count), backgroundColor: b.map((x) => (x.negative ? tok('danger-800') : tok('info-700'))) }] },
  options: { plugins: { legend: { display: false }, title: { display: true, text: 'Net benefit distribution (horizon-aware, after setup)' } }, scales: { y: { title: { display: true, text: 'draws' } } } } };
}

/** P10 / P50 / P90 / P(net<0) / CVaR cards, the distribution and the sensitivity (correlation) table of the last run. */
export function RunResults({ run }: { run: SimRun }) {
  const { tok } = useTheme(), s = run.stats, cfg = useMemo(() => histogram(run.outcomes, tok), [run, tok]);
  if (!isFinite(s.p10)) return <Callout kind="warn">The net benefit is not defined for a horizon beyond 3 years (legacy limitation): the distribution cannot be computed.</Callout>;
  const tone = (v: number) => (v < 0 ? 'brick' : 'teal');
  return (
    <>
      <StaleBanner />
      <StatRow>
        <Stat label="P10 (downside)" value={fmtEur(s.p10)} tone={tone(s.p10)} /><Stat label="P50 (median)" value={fmtEur(s.p50)} tone={s.p50 < 0 ? 'brick' : 'blue'} />
        <Stat label="P90 (upside)" value={fmtEur(s.p90)} tone="teal" /><Stat label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)}%`} tone={pNegTone(s.pNetNeg)} />
        <Stat label="CVaR 10%" value={fmtEur(s.cvar10)} tone="amber" /><Stat label="Draws · seed" value={`${s.n} · ${s.seed}`} tone="grey" />
      </StatRow>
      <ChartPanel config={cfg} label="Net benefit distribution" />
      <DataTable caption="Sensitivity (correlation with net outcome)" rows={run.sens} rowKey={(x) => x.id} columns={[
        { key: 'p', header: 'Parameter', render: (x) => x.label },
        { key: 'r', header: 'r', align: 'center', render: (x) => <b className={Math.abs(x.r) > STRONG_CORRELATION ? 'ac-corr is-strong' : 'ac-corr'}>{x.r > 0 ? '+' : ''}{x.r}</b> },
      ]} />
    </>
  );
}
