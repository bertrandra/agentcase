import { makeCtx } from '@/domain';
import { pfStressJob } from '@/domain/portfolio';
import { mcDrawsOf, mcSeedOf } from '@/domain/stress';
import { appStore } from '@/store/instance';
import { pfSimStore, type PfSimParams } from '@/store/portfolioSimulation';

/** Draws and seed offered for the portfolio run: those set for the active product's Monte Carlo (1000 and 42 by default) until the user chooses others. */
export function portfolioSimParams(): PfSimParams {
  const set = pfSimStore.getState().params;
  if (set) return set;
  const c = makeCtx(appStore().getState().doc);
  return { draws: mcDrawsOf(c), seed: mcSeedOf(c) };
}

/** Draws (100..5000, whole) and seed (>= 1, whole) of the next portfolio run; out of range values are clamped. */
export function setPortfolioSimParams(p: Partial<PfSimParams>): PfSimParams {
  const cur = portfolioSimParams(), draws = Number.isFinite(p.draws) ? Math.max(100, Math.min(5000, Math.round(p.draws as number))) : cur.draws;
  const seed = Number.isFinite(p.seed) ? Math.max(1, Math.round(p.seed as number)) : cur.seed, next = { draws, seed };
  pfSimStore.setState({ params: next });
  return next;
}

const yieldToScreen = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });
let token = 0;

/**
 * Run the portfolio Monte Carlo on the current portfolio: one product at a time with a pause between two products, so the screen stays
 * responsive and `progress` can be shown. Deterministic (same portfolio, draws, seed and correlation => same result). A newer call supersedes
 * a run in flight. The result is derived data (never in the document or the history); it resolves once the run is stored.
 */
export async function runPortfolioSimulation(params?: Partial<PfSimParams>): Promise<void> {
  const me = ++token, { draws, seed } = params ? setPortfolioSimParams(params) : portfolioSimParams(), pf = appStore().getState().portfolio;
  const job = pfStressJob(pf, { draws, seed, rho: pf.rho ?? 0 });
  pfSimStore.setState({ progress: 0 });
  try {
    for (let i = 0; i < job.steps; i++) {
      job.step(i);
      if (me !== token) return;
      pfSimStore.setState({ progress: (i + 1) / job.steps });
      await yieldToScreen();
      if (me !== token) return;
    }
    pfSimStore.setState({ run: job.finish(), progress: null });
  } catch (e) {
    if (me === token) pfSimStore.setState({ progress: null });
    throw e;
  }
}
