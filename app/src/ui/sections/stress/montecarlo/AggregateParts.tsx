import { useMemo, type ReactNode } from 'react';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import type { ProductStress, SelectionStress } from '@/domain/portfolio';
import { pNegTone } from '@/domain/stress';
import { useActiveProductId } from '@/store/portfolioHooks';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Badge, Callout, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { fmtEur } from '../fmt';
import { histogram } from './RunResults';

const R = 'right' as const;
const pct = (x: number): string => `${Math.round(x * 100)} %`;
const tone = (v: number) => (v < 0 ? 'brick' : 'teal');

/** Warning shown while the last portfolio run is older than the portfolio (same wording as Portfolio stress), with the button to run again. */
export function StaleRun() {
  return (
    <Callout kind="warn">⚠️ <strong>The portfolio changed since the last simulation</strong> — the distribution and the figures below are stale.{' '}
      <button type="button" onClick={() => { void runPortfolioSimulation(); }}>⟳ Run again</button></Callout>
  );
}

/** P10 / P50 / P90 / P(net < 0) / CVaR / mean cards of a stats block (`children`: more cards at the end of the row). */
export function StatsCards({ s, children }: { s: SelectionStress['stats']; children?: ReactNode }) {
  return (
    <StatRow>
      <Stat label="P10 (adverse outcome)" value={fmtEur(s.p10)} tone={tone(s.p10)} /><Stat label="P50 (median)" value={fmtEur(s.p50)} tone={s.p50 < 0 ? 'brick' : 'blue'} />
      <Stat label="P90 (favourable outcome)" value={fmtEur(s.p90)} tone="teal" /><Stat label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)} %`} tone={pNegTone(s.pNetNeg)} />
      <Stat label="CVaR 10 %" value={fmtEur(s.cvar10)} tone="amber" /><Stat label="Mean" value={fmtEur(s.mean)} tone="blue" />
      {children}
    </StatRow>
  );
}

const cols = (rLabel: string, r: (p: ProductStress) => number): AggColumn<ProductStress>[] => [
  { key: 'p10', header: 'P10', align: R, render: (p) => fmtEur(p.stats.p10) }, { key: 'p50', header: 'P50', align: R, render: (p) => fmtEur(p.stats.p50) },
  { key: 'p90', header: 'P90', align: R, render: (p) => fmtEur(p.stats.p90) }, { key: 'mean', header: 'Mean', align: R, render: (p) => fmtEur(p.stats.mean) },
  { key: 'cvar', header: 'CVaR 10 %', align: R, render: (p) => fmtEur(p.stats.cvar10) },
  { key: 'neg', header: 'P(net < 0)', align: R, render: (p) => <Badge tone={pNegTone(p.stats.pNetNeg)}>{pct(p.stats.pNetNeg)}</Badge> },
  { key: 'r', header: rLabel, align: R, render: (p) => { const v = r(p); return `${v > 0 ? '+' : ''}${v}`; } },
];

/** The selection’s distribution (cards, histogram for the portfolio, diversification) and its product table with the selection’s stats as the roll-up line. */
export function SelectionResults({ sel, scope }: { sel: SelectionStress; scope: 'portfolio' | 'wave' }) {
  const d = sel.diversification, s = sel.stats, config = useMemo(() => (sel.outcomes ? histogram(sel.outcomes) : null), [sel.outcomes]);
  const columns = cols(scope === 'portfolio' ? 'Correlation with the portfolio' : 'Correlation with the wave', (p) => (scope === 'portfolio' ? p.r : p.rWave));
  const t = (v: number) => fmtEur(v);
  return (
    <>
      <StatsCards s={s} />
      {config ? <Panel title="Portfolio distribution"><ChartPanel config={config} label="Distribution of the portfolio net benefit" /></Panel>
        : <p className="ac-muted">The histogram is drawn for the whole portfolio; a wave keeps its statistics (above and below).</p>}
      <Panel title="Risk reduction (diversification)">
        <StatRow>
          <Stat label="Sum of the products’ P10" value={t(d.sumP10)} tone="grey" /><Stat label={`${sel.label} P10`} value={t(d.p10)} tone={tone(d.p10)} />
          <Stat label="Risk reduction" value={t(d.reduction)} tone="teal" hint="Selection P10 minus the sum of the stand-alone P10s" />
        </StatRow>
      </Panel>
      <AggregateTable caption={`Stress by product — ${sel.label}`} rows={sel.products} columns={columns} edit={false}
        totals={{ label: `Total — ${sel.label}`, cells: { p10: t(s.p10), p50: t(s.p50), p90: t(s.p90), mean: t(s.mean), cvar: t(s.cvar10), neg: pct(s.pNetNeg) } }} />
    </>
  );
}

/** Per-product detail of the drill-down: the product’s own distribution from the last portfolio run (read-only, nothing is recomputed). */
export function ProductStressDetail() {
  const id = useActiveProductId(), { run, stale } = usePortfolioSimulation(), p = run?.products.find((x) => x.id === id);
  return (
    <SectionFrame title="Stand-alone distribution of the product" result={
      p ? <>{stale && <p className="ac-muted">Stale: the portfolio changed since the last simulation.</p>}<StatsCards s={p.stats} />
        <p className="ac-muted">Correlation of the product’s draws with the portfolio: {p.r > 0 ? '+' : ''}{p.r}; with its wave: {p.rWave > 0 ? '+' : ''}{p.rWave}.</p></>
        : <p className="ac-muted">This product is not in the last portfolio simulation: run it to see its distribution.</p>
    } />
  );
}
