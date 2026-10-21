import type { FgParams } from './types';

/** Generator defaults (legacy FG_DEFAULT). PROVENANCE: unvalidated engineering estimates, simulated — not measured data. */
export const FG_DEFAULT: FgParams = {
  sprintWeeks: 2, piWeeks: 12, releaseEveryWeeks: 8, rcLeadDays: 10, approvalRejectRate: 0.3, approvalLeadDays: 5, envPromotionDays: 3,
  deployFailRate: 0.12, rollbackRate: 0.08, retryDelayDays: 2, commitsPerAgentRun: 0.15, humanCommitsPerDevWeek: 15,
  buildsPerWeek: 5, buildFailRate: 0.15, artefactsPerBuild: 2, incidentsPerProdDeploy: 0.8, sevCritical: 0.1, sevWarning: 0.3,
  feedbackPerRelease: 2.5, gateFailRate: 0.18, rollWeeks: 8, minSample: 5, density: 1, maxRecords: 1500, seed: 20260701,
};

/** The case's parameters with the defaults behind them (legacy fgP(): a missing or NaN value falls back). */
export function fgParams(own: Partial<FgParams> | null | undefined): FgParams {
  const out = { ...FG_DEFAULT } as Record<string, number>;
  for (const [k, v] of Object.entries(own ?? {})) if (k in FG_DEFAULT && v != null && !isNaN(v as number)) out[k] = v as number;
  return out as unknown as FgParams;
}

/** Minimum sample for a rate to be reported (a rate over fewer events is quantised, not measured). */
export const minSample = (p: FgParams): number => Math.max(1, p.minSample);
