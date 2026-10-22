import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { useSelectionStress } from '@/store/selectionHooksStress';
import { useViewScope } from '@/store/viewScope';
import { goSection } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { ProductDrill } from '@/ui/widgets/ProductDrill';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Controls } from '../../portfolio/stress/Controls';
import { ExcludedNote } from '../AggParts';
import { ProductStressDetail, SelectionResults, StaleRun } from './AggregateParts';

const help = (
  <p>In a Portfolio or a Wave view this section shows the <strong>portfolio Monte Carlo</strong> of the selection: every planned product is simulated as in the single-product Monte Carlo and the net benefits are added draw by draw.
    Draws, seed and correlation ρ are set below; the same run feeds Portfolio stress and the portfolio verdict. A product on its own keeps its single-product Monte Carlo: choose “Edit this product”.</p>
);

/** Monte Carlo — Aggregate view: the portfolio Monte Carlo restricted to the Portfolio or the Wave (distribution, P10/P50/P90, P(net < 0), diversification), with the run button. */
export default function MonteCarloAggregate() {
  const vs = useViewScope(), { run, stale, progress } = usePortfolioSimulation(), sel = useSelectionStress();
  return (
    <SectionFrame title="🎲 Monte Carlo — uncertainty explorer" help={help} input={<Controls />} result={
      <>
        <ExcludedNote />
        {run && stale && <StaleRun />}
        {sel ? <SelectionResults sel={sel} scope={vs.kind === 'wave' ? 'wave' : 'portfolio'} />
          : <p className="ac-muted"><em>{run ? `${vs.label} has no planned product in the last simulation: run it again.` : 'No simulation yet: run the portfolio simulation to draw the distribution of the selection.'}</em>{' '}
            {!run && progress === null && <button type="button" onClick={() => { void runPortfolioSimulation(); }}>▶ Run now</button>}</p>}
        <Callout kind="blue">This is the portfolio simulation of the selection ({vs.label}), shared with{' '}
          <button type="button" className="ac-link" onClick={() => goSection('portfolio-stress')}>🎲 Portfolio stress</button>: nothing is recomputed here. The distribution of one product on its own is below.</Callout>
        <ProductDrill Section={ProductStressDetail} productIds={vs.productIds} />
      </>
    } />
  );
}
