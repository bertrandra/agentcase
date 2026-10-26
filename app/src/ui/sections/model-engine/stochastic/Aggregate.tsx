import type { StochasticRow } from '@/domain/portfolio';
import { mcsOf } from '@/domain/model/modelState';
import { useCtx } from '@/store/hooks';
import { useActiveProductId } from '@/store/portfolioHooks';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { useSelectionStress, } from '@/store/selectionHooksStress';
import { useStochasticRows } from '@/store/selectionHooksModelEngine';
import { goSection } from '@/ui/uiState';
import { fmtEur } from '@/ui/format';
import { Callout, Stat, StatRow } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { countOf, onOff, phaseColumn, R, RollupFrame } from '../../stress/AggParts';

const COLS: AggColumn<StochasticRow>[] = [
  phaseColumn('P4'), { key: 'draws', header: 'Draws', align: R, render: (r) => r.draws.toLocaleString('en-US') },
  { key: 'seed', header: 'Seed', align: R, render: (r) => r.seed }, { key: 'rho', header: 'ρ (organisational)', align: R, render: (r) => r.rho },
  { key: 'p50', header: 'P50 net benefit (portfolio run)', align: R, title: 'Median of the product’s own distribution in the last portfolio simulation',
    render: (r) => (r.p50 === null ? '—' : fmtEur(r.p50)) },
];

/**
 * Per-product detail: the stochastic settings of the product and its distribution in the last portfolio simulation (the P4 run of the edited product
 * is not shown for another product).
 */
function StochasticDetail() {
  const c = useCtx(), id = useActiveProductId(), m = mcsOf(c.s.MODEL), p = usePortfolioSimulation().run?.products.find((x) => x.id === id);
  return (
    <SectionFrame title="Stochastic layer of the product" result={
      <>
        <StatRow><Stat label="Phase P4" value={onOff(!!c.s.MODEL.FLAGS.mcs)} /><Stat label="Draws" value={String(m.draws)} />
          <Stat label="Seed" value={String(m.seed)} /><Stat label="ρ (organisational)" value={String(m.rho)} /></StatRow>
        {p ? <StatRow><Stat label="P10 (portfolio run)" value={fmtEur(p.stats.p10)} /><Stat label="P50 (portfolio run)" value={fmtEur(p.stats.p50)} />
          <Stat label="P90 (portfolio run)" value={fmtEur(p.stats.p90)} /></StatRow>
          : <p className="ac-muted">Not in the last portfolio simulation.</p>}
      </>
    } />
  );
}

/**
 * Stochastic layer (P4) — Aggregate view: phase flag, settings and median net benefit of each product in view; the distribution of the selection is
 * the portfolio Monte Carlo.
 */
export default function StochasticAggregate() {
  const { rows, on } = useStochasticRows(), sel = useSelectionStress();
  return (
    <RollupFrame title="📊 Stochastic layer & baseline drift · P4 · v16.8" caption="Stochastic layer by product" rows={rows} columns={COLS}
      Section={StochasticDetail}
      totals={{ on: `${countOf(on, rows.length)} on`, p50: sel ? fmtEur(sel.stats.p50) : '—' }}
      notes={<Callout kind="blue">The roll-up P50 is the median of the selection’s portfolio simulation (run it in{' '}
        <button type="button" className="ac-link" onClick={() => goSection('portfolio-stress')}>🎲 Portfolio stress</button>), not a sum of medians. The tornado
          and the baseline drift belong to the edited product: choose “Edit this product”.</Callout>} />
  );
}
