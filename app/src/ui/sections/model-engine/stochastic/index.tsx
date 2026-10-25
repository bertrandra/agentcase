import { mcsRunStore, runMcsAsync } from '@/controllers/modelRun';
import { enableMcs, setMcsDraws, setMcsRho, setMcsSeed } from '@/controllers/modelStochastic';
import { mcsOf } from '@/domain/model/modelState';
import { useCtx } from '@/store/hooks';
import { toast } from '@/ui/uiState';
import { NumField } from '@/ui/widgets/CommitField';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { PhaseBanner, PhaseSwitch, fmtK } from '../shared';
import { useMcsRun } from '../useMcsRun';
import { DriftCard } from './DriftCard';
import { Results } from './Results';

const help = (
  <p>A separate Monte Carlo layer alongside the 🎲 Monte Carlo tab: it samples the P1/P3 economic drivers named in the modelling-engine spec — acceptance
  rate, ramps, day rate, supervising capacity (Beta / Triangular), token price (Lognormal) — correlated within an organisational group through a one-factor
  Gaussian copula, with the token price kept exogenous. The tornado ranks each driver&apos;s P10→P90 swing on horizon-end savings. Counterfactual baseline
  drift reports gross savings and the smaller, more honest attributable figure once the improvement that would have happened anyway is subtracted. Nothing
  here changes the deterministic case.</p>
);

/** P4 — stochastic layer: seeded correlated draws, distribution, tornado and convergence, plus the counterfactual baseline drift. */
export default function ModelStochasticSection() {
  const c = useCtx(), mc = mcsOf(c.s.MODEL), on = !!c.s.MODEL.FLAGS.mcs, { last, running } = useMcsRun();
  const run = () => {
    runMcsAsync().then((ms) => {
      const l = mcsRunStore.getState().last;
      if (l) toast(`✓ ${l.n.toLocaleString('en-US')} draws · seed ${l.seed} · ${ms} ms — P50 ${fmtK(l.stats.savY3.p50)}`);
    }).catch((e: Error) => toast(`✕ Simulation failed — ${e.message || 'unknown error'}`));
  };
  return (
    <SectionFrame title="📊 Stochastic layer & baseline drift · P4 · v16.8" help={help}
      input={<>
        <div className="ac-form-row">
          <PhaseSwitch on={on} phase="P4" onToggle={() => enableMcs(!on)} />
          <NumField label="Draws" value={mc.draws} min={100} max={20000} step={100} width={90} onCommit={setMcsDraws} />
          <NumField label="Seed" value={mc.seed} width={120} onCommit={setMcsSeed} />
          <NumField label="ρ (organisational)" value={mc.rho} min={0} max={1} step={0.05} width={74} onCommit={setMcsRho} />
          <button
            type="button"
            data-tone="primary"
            disabled={!on || running}
            onClick={run}
          >{running ? `⏳ Running ${Number(mc.draws || 0).toLocaleString('en-US')} draws…` : '▶ Run simulation'}</button>
        </div>
        <PhaseBanner on={on} off=".">
          Click Run to sample. This is a <strong>separate</strong> layer from the existing 🎲 Monte Carlo tab — it perturbs the specific P1/P3 economic
          drivers (Beta/Triangular/Lognormal) rather than generic UI points, correlated via a one-factor Gaussian copula.
        </PhaseBanner>
        {last && !on && <Callout>Showing the last run (n={last.n},
          seed={last.seed}) from before the phase was disabled — re-enable and run again for a live result.</Callout>}
      </>}
      result={<>{last && on && <Results run={last} />}<DriftCard /></>} />
  );
}
