/** @calc-zone tuning-programme */
import type { Ctx } from '../ctx';
import { engagementKey } from '../engagement';
import { maturityInfo } from './maturity';
import { modelOf } from './memo';
import { opModelCompute } from './opmodel';

// Wave 4 (completeness) — analytical blocks: none of them feeds the euro result.
// Like the legacy read-outs, a field left at 0 or blank falls back to its default (`P(id) || default`).
const num = (c: Ctx, id: string, dflt: number): number => c.inp.p(id) || dflt;

/** EV-21 pilot sizing: duration (prove weeks + 2 weeks per break-in sprint) and indicative cost. */
export function pilotSizing(c: Ctx) {
  const m = modelOf(c), fte = num(c, 'pilotFte', 3), breakIn = num(c, 'pilotBreakin', 2), weeks = num(c, 'pilotWeeks', 12);
  const totalWeeks = weeks + breakIn * 2;
  return { fte, breakIn, weeks, totalWeeks, cost: fte * (totalWeeks / 52) * (m.wd || 220) * (m.tgtTJM || 600) };
}

/** EV-22 internal capability (Volet A): operational / in training / target mass. */
export function capability(c: Ctx) {
  const ops = c.inp.p('capOps') || 0, training = c.inp.p('capTrain') || 0, target = c.inp.p('capTarget') || 0;
  const bar = (v: number) => (target > 0 ? Math.min(100, Math.round((v / target) * 100)) : 0);
  return { ops, training, target, pct: target > 0 ? Math.round((ops / target) * 100) : 0, bars: { ops: bar(ops), training: bar(training), target: bar(target) } };
}

/** EV-18 multi-pod / AI-Native SAFe overhead (~3 % coordination per extra pod, capped at 20 %). */
export function safeOverhead(c: Ctx) {
  const pods = opModelCompute(c, 2).pods, overheadPct = pods <= 1 ? 0 : Math.min(20, (pods - 1) * 3);
  const stage = pods <= 1 ? 'Single pod — no scaling overhead' : pods <= 3 ? 'Team-of-teams — enabling coaching' : pods <= 6 ? 'Program level — ART coordination' : 'Portfolio level — the bottleneck moves up';
  return { pods, overheadPct, stage };
}

/** EV-26 IP · confidentiality · sovereignty synthesis per engagement context. */
export const IP_SYNTH: Record<string, [string, string, string]> = {
  MSC: ['Capgemini controls stack & assets; deliverable IP per contract, assets reusable', 'Data on Capgemini infra — strongest confidentiality control', 'Sovereign options available (SovBox / on-prem) if required'],
  MSI: ['Client infra; asset reuse negotiated; deliverable IP typically client', 'Data under client rules — shared responsibility', 'Sovereignty follows client hosting; air-gap possible'],
  STA: ['Individual contribution; little asset reuse; IP client by default', 'Client-framed data; endured confidentiality posture', 'Sovereignty entirely client-defined'],
};
export const ipSynthesis = (c: Ctx) => { const key = engagementKey(c); return { key, rows: IP_SYNTH[key] ?? (IP_SYNTH.MSC as [string, string, string]) }; };

/** EV-14 maturity transition criteria. */
export const TRANSITIONS: [string, string][] = [
  ['L1 → L2', 'Team rules & shared prompts in place; agents used on ≥ 1 activity; basic guardrails; positive first-value signal'],
  ['L2 → L3', 'Agent-recommendation acceptance ≥ 90%; human override 5–15%; 0 P1 incident caused by an agent; all gates green for 90 days; Design Authority approval'],
  ['L3 → L4', 'Multi-agent orchestration stable; autonomous within bounded scope; measured value at scale; AI Office + Design Authority sign-off; governance & audit in place'],
];
export const currentLevel = (c: Ctx): number => maturityInfo(c).capped;

/** EV-28 token cache: share of input cost removed and the illustrative $/dev-day figures. */
export function tokenCache(c: Ctx) {
  const share = num(c, 'cacheShare', 70) / 100, disc = num(c, 'cacheDisc', 90) / 100, reduction = share * disc, base = 13;
  return { reduction, base, cached: Math.round(base * (1 - reduction * 0.6)), best: 30 };
}
