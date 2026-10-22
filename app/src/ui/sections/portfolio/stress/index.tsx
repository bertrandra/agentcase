import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Controls } from './Controls';
import { Results } from './Results';

const help = (
  <>
    <p>Each product is simulated as in <strong>Monte Carlo</strong> (same uncertain parameters, same net benefit over its horizon), with its own draw: run seed ⊕ product id.
      The portfolio net benefit, for one draw, is the <strong>sum</strong> of that of the scheduled products; nothing is recomputed here.</p>
    <p><strong>ρ</strong> sets the correlation between products: each uncertain input of a product is √ρ · Z + √(1 − ρ) · ε, where Z is a shock common to all products and ε the product’s own shock,
      then mapped back to the same marginal distribution as in the single-product simulation. ρ = 0: independent (default); ρ = 1: same shocks, diversification disappears.
      The distribution of each product does not depend on ρ, only the aggregate changes. The simulation is deterministic: same inputs and same seed, same results.</p>
  </>
);

/** Portfolio stress (F20) — aggregated Monte Carlo of the scheduled products, correlation ρ, risk reduction, by wave and by product. */
export default function PortfolioStressSection() {
  const { run, stale } = usePortfolioSimulation();
  return (
    <SectionFrame title="🎲 Portfolio stress" help={help} input={<Controls />}
      result={run ? <Results run={run} stale={stale} rerun={() => { void runPortfolioSimulation(); }} /> : <p className="ac-muted"><em>No simulation: run the simulation to draw the portfolio distribution.</em></p>} />
  );
}
