import { useMemo } from 'react';
import type { PfStress } from '@/domain/portfolio';
import { Callout, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { goSection } from '@/ui/uiState';
import { StatsCards } from '../../stress/montecarlo/AggregateParts';
import { histogram } from '../../stress/montecarlo/RunResults';
import { fmtEur } from '../../stress/fmt';
import { Tables } from './Tables';

/** Cards, distribution, diversification and the by-wave / by-product tables of the last portfolio run. */
export function Results({ run, stale, rerun }: { run: PfStress; stale: boolean; rerun: () => void }) {
  const s = run.stats, d = run.diversification;
  const config = useMemo(() => {
    const h = histogram(run.outcomes), plugins = { ...(h.options?.plugins ?? {}), title: { display: true, text: 'Distribution of the portfolio net benefit (sum of the products, after setup)' } };
    return { ...h, options: { ...h.options, plugins } };
  }, [run]);
  const tone = (v: number) => (v < 0 ? 'brick' : 'teal');
  return (
    <>
      {stale && (
        <Callout kind="warn">⚠️ <strong>The portfolio changed since the last simulation</strong> — the distribution and the portfolio verdict are stale.{' '}
          <button type="button" onClick={rerun}>⟳ Run again</button></Callout>
      )}
      <StatsCards s={s}><Stat label="Draws · seed · ρ" value={`${run.draws} · ${run.seed} · ${String(run.rho)}`} tone="grey" /></StatsCards>
      <Panel title="Portfolio distribution"><ChartPanel config={config} label="Distribution of the portfolio net benefit" /></Panel>
      <Panel title="Risk reduction (diversification)">
        <StatRow>
          <Stat label="Sum of the products’ P10" value={fmtEur(d.sumP10)} tone="grey" /><Stat label="Portfolio P10" value={fmtEur(d.p10)} tone={tone(d.p10)} />
          <Stat label="Risk reduction" value={fmtEur(d.reduction)} tone="teal" hint="Portfolio P10 minus the sum of the stand-alone P10s" />
        </StatRow>
        <p className="ac-muted">What the portfolio gains on the adverse scenario because products do not all fall together: portfolio P10 − Σ P10 of each product alone.
          Zero when ρ = 1 (same shocks), maximal when the products are independent (ρ = 0).</p>
      </Panel>
      <Panel title="By wave and by product"><Tables waves={run.waves} products={run.products} total={s} /></Panel>
      <Callout kind="blue">The distribution of a product on its own is that of its own Monte Carlo simulation (same draw, product-specific seed): see{' '}
        <button type="button" className="ac-link" onClick={() => goSection('montecarlo')}>🎲 Monte Carlo</button>; the portfolio verdict is in{' '}
        <button type="button" className="ac-link" onClick={() => goSection('decision')}>🧭 Decision Intelligence</button>.</Callout>
    </>
  );
}
