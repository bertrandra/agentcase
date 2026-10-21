import type { Ctx } from '../../ctx';
import { hriIndex } from '../../engagement';
import { evlModel } from '../../model/evidence';
import { flowModel } from '../../model/flow';
import { lceModel } from '../../model/lce';
import { evtModel } from '../../model/evt';
import { supModel } from '../../model/supView';
import { mcFingerprint, mcSeedOf, runMonteCarlo, type McResult } from '../../stress';
import { decide, evaluateStrategies, readinessIndex, stratNormalize, stratWeightsOf } from '../../verdict';
import { riskScoreRaw } from '../../verdict/risk';
import { type VarRuntime, v } from './types';

const fallback = new Map<number, McResult>();
/**
 * The last Monte Carlo run, else (like the legacy decisionEngine) an 800-draw run on the case. That run is kept per model fingerprint,
 * so edits that do not touch the model (a dashboard label, a persona list) never pay for it twice.
 */
export function mcOrFresh(c: Ctx, rt: VarRuntime): McResult {
  if (rt.mc) return rt.mc;
  const key = mcFingerprint(c.s as unknown as Record<string, unknown>);
  let r = fallback.get(key);
  if (!r) {
    r = runMonteCarlo(c, 800, mcSeedOf(c));
    if (fallback.size >= 4) fallback.delete(fallback.keys().next().value as number);
    fallback.set(key, r);
  }
  return r;
}
const top = (c: Ctx) => stratNormalize(evaluateStrategies(c), stratWeightsOf(c.s))[0];

/** Risk, decision verdict, Monte Carlo statistics, strategies, readiness and the model-engine read-outs. */
export const ENGINE_VARS = [
  v('consolidatedRiskScore', 'Consolidated agentic risk score (0-100)', 'INT', '', 'risk', (c) => Math.round(riskScoreRaw(c) * 100)),
  v('diVerdict', 'Decision Intelligence verdict', 'TEXT', '', 'decision', (c, rt) => decide(c, mcOrFresh(c, rt)).verdict),
  v('diConfidencePct', 'DI confidence (P(net>0))', 'PCT', '%', 'decision', (c, rt) => decide(c, mcOrFresh(c, rt)).confidence),
  v('mcP10', 'Monte Carlo P10 (downside)', 'EUR_K', '€', 'montecarlo', (_c, rt) => rt.mc?.stats.p10 ?? null),
  v('mcP50', 'Monte Carlo P50 (median)', 'EUR_K', '€', 'montecarlo', (_c, rt) => rt.mc?.stats.p50 ?? null),
  v('mcP90', 'Monte Carlo P90 (upside)', 'EUR_K', '€', 'montecarlo', (_c, rt) => rt.mc?.stats.p90 ?? null),
  v('mcPNegPct', 'P(net benefit < 0)', 'PCT', '%', 'montecarlo', (_c, rt) => (rt.mc ? rt.mc.stats.pNeg * 100 : null)),
  v('topStrategyLabel', 'Top-ranked strategy', 'TEXT', '', 'strategies', (c) => { const t = top(c); return t ? `${t.icon} ${t.label}` : '—'; }),
  v('topStrategyScore', 'Top-ranked strategy composite score (0-100)', 'INT', '', 'strategies', (c) => top(c)?.score ?? null),
  v('aiReadinessIndex', 'AI readiness index (0-100)', 'INT', '', 'readiness', (c) => readinessIndex(c.s)),
  v('humanReadinessIndex', 'Human readiness index (0-100)', 'INT', '', 'readiness', (c) => hriIndex(c)),
  v('monteCarloP50', 'Monte Carlo P50 (last run)', 'EUR_K', '€', 'model-stochastic', (_c, rt) => rt.mc?.stats.p50 ?? null),
  v('lceWeightedEN', 'Weighted expected iterations E[N]', 'DEC2', '', 'model-convergence', (c) => lceModel(c).weightedEN),
  v('esupNeededY3', 'Supervisors needed at achieved vFTE, Y3 (Esup*)', 'DEC1', 'FTE', 'model-supervision', (c) => supModel(c).esupNeeded[2]),
  v('flowTimeToMarketNpv', 'Time-to-market NPV (P5, distinct from savings NPV)', 'EUR_K', '€', 'model-flow', (c) => flowModel(c).flowNpv),
  v('evidenceConfidenceGrade', 'Evidence confidence grade', 'TEXT', '', 'model-evidence', (c, rt) => evlModel(c, rt.tornado).grade || '—'),
  v('verificationTaxRatePct', 'Verification tax rate (endogenous)', 'PCT', '%', 'model-verification', (c) => evtModel(c).rate * 100),
];
