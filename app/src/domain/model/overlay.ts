import type { Ctx } from '../ctx';
import type { ModelResult } from '../types/model';
import { timeFor } from '../time';
import { modelRaw } from './raw';

export const activeCurve = (c: Ctx): string => c.s.scurve?.curve || 'spline.default';

/**
 * model() = modelRaw() + Time-Engine overlay: under a non-legacy curve every annual array is replaced by the engine's own
 * yearly sums/samples, so Annual, Monthly, Financial and Monte Carlo read the same figures (legacy model(), v18.5–v18.8).
 */
function buildModel(c: Ctx): ModelResult {
  const raw = modelRaw(c), curve = activeCurve(c);
  if (curve.startsWith('legacy')) return raw;
  try {
    const eng = timeFor(c, { mode: 'full', curveModelId: curve, model: raw });
    const ny = raw.yearSav?.length ? raw.yearSav.length : raw.horizon;
    const Y = Array.from({ length: ny }, (_, i) => eng.year(Math.min(i + 1, eng.horizonYears)));
    raw.yearSav = Y.map((v) => v.savings);
    raw.yearRun = Y.map((v) => v.totalRunCost);
    raw.yearTeamCost = Y.map((v) => v.teamCost);
    raw.yearToken = Y.map((v) => v.tokenCost);
    raw.yearRunAgenticCost = Y.map((v) => v.runTeamCost);
    raw.yearInfraEff = Y.map((v) => v.infrastructureCost);
    raw.yearETP = Y.map((v) => v.humanFteEnd);
    raw.yearAgentVfte = Y.map((v) => v.agentVfteEnd);
    raw.yearAgentVfteRaw = Y.map((v) => v.agentVfteRawEnd);
    raw.yearETPRaw = Y.map((v) => raw.base.etp - v.agentVfteRawEnd);
    raw.conv.khRunYr = Y.map((v) => v.knowledgeHubCost);
    raw.conv.ktAvoidYr = Y.map((v) => v.knowledgeTransferAvoided);
    raw.conv.vTaxYr = Y.map((v) => v.verificationTaxCost);
    raw.conv.loopExtYr = Y.map((v) => v.externalReworkCost);
    raw.yearRunAgenticETP = Y.map((v) => v.runTeamFteEnd);
    raw.runAgenticETP = raw.yearRunAgenticETP[raw.yearRunAgenticETP.length - 1] as number;
    raw.runAgenticCost = raw.yearRunAgenticCost[raw.yearRunAgenticCost.length - 1] as number;
    raw.yearTokenM = raw.yearToken.map((v) => (raw.tokenCost > 0 ? v / raw.tokenCost : 0));
    raw.agentRunsYear = raw.yearTokenM.map((v) => (raw.tokensPerArt > 0 ? (v * 1e6) / raw.tokensPerArt : 0));
    const maxRamp = Math.max(...raw.ramps);
    raw.yearArtMonth = Y.map((v) => raw.baseArtMonth * (maxRamp > 0 ? v.adoptionEndPct / maxRamp : 0));
    raw.yearAgentCapacity = raw.yearAgentVfte.map((v) => v * raw.PROD_FACTOR);
    const drift = Y.map((_, i) => raw.baselineRun * Math.pow(1 - (raw.cbd.delta || 0), i + 1));
    raw.cbd.yearBaselineDrift = drift;
    raw.cbd.yearSavAttributable = raw.yearSav.map((s, i) => s - (raw.baselineRun - (drift[i] as number)));
    raw.cbd.wedge = raw.yearSav.map((s, i) => s - (raw.cbd.yearSavAttributable[i] as number));
    raw._curveOverlay = curve;
  } catch (e) {
    raw._overlayError = String((e as Error)?.message ?? e);
  }
  return raw;
}

const cache = new WeakMap<Ctx, ModelResult>();
/** model(), computed once per context identity (a mutated copy `{...c}` is a new identity, so it never sees a stale entry). Treat the result as read-only. */
export function model(c: Ctx): ModelResult {
  let m = cache.get(c);
  if (!m) { m = buildModel(c); cache.set(c, m); }
  return m;
}
