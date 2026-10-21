import { useSimulation } from '@/store/simulation';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useAutoRerun } from '../useSimulation';
import { Controls } from './Controls';
import { ParamTable } from './ParamTable';
import { RunResults } from './RunResults';

const help = (
  <>
    <p>Numerically explores the uncertainty around the business case. Each draw perturbs the uncertain parameters (triangular around their current value),
      evaluates the calculation core and collects the horizon-aware net benefit (Σ savings − setup). The distribution — not a single point — is what the Decision Intelligence layer consumes.</p>
    <p>Runs are seeded and reproducible (mulberry32). Ranges are editable benchmarks. The engine never touches the screen while sampling.</p>
  </>
);

/** Monte Carlo — probabilistic exploration of the business case: distribution, P10/P50/P90, CVaR and sensitivity. */
export default function MonteCarloSection() {
  const { run } = useSimulation();
  useAutoRerun();
  return (
    <SectionFrame title="🎲 Monte Carlo — uncertainty explorer" help={help}
      input={<><Controls /><ParamTable /></>}
      result={run ? <RunResults run={run} /> : <p className="ac-muted"><em>No run yet — click &quot;Run simulation&quot; to sample the distribution.</em></p>} />
  );
}
