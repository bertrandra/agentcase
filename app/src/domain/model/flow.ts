import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { phaseScope, totalEffort } from '../scope';
import { rampAt } from '../time/adapters';
import type { ModelResult } from '../types/model';
import { flowOf, numOr } from './modelState';
import { model } from './overlay';

export interface DoraAnchor { id: string; label?: string; asis: number; target: number; fmt?: string; dir?: string }
/** Built-in lead-time anchor (the case may carry its own DORA_ANCHORS). */
export const DORA_ANCHORS_DEFAULT: DoraAnchor[] = [
  { id: 'deployFreq', asis: 0.75, target: 14 }, { id: 'leadTime', asis: 21, target: 1 }, { id: 'mttr', asis: 5, target: 0.75 },
  { id: 'changeFail', asis: 17, target: 4 }, { id: 'velocitySp', asis: 35, target: 59 },
];
export function daGet(c: Ctx, id: string): DoraAnchor {
  const own = (c.s as unknown as { DORA_ANCHORS?: DoraAnchor[] }).DORA_ANCHORS;
  return (own ?? []).find((a) => a.id === id) ?? DORA_ANCHORS_DEFAULT.find((a) => a.id === id) as DoraAnchor;
}
/** Clamp the interpolation to the declared [as-is, target] interval, whichever way the metric improves. */
export function anchorClamp(asis: number, target: number, r: number): number {
  const v = asis + (target - asis) * r;
  return target >= asis ? Math.min(v, target) : Math.max(v, target);
}

/** Effort-weighted agent-supervision share of the whole SDLC catalogue (legacy refAvgAgent()). */
function refAvgAgent(c: Ctx): number {
  const t = totalEffort(c.a, c.s);
  return t ? c.a.sdlc.reduce((s, a) => s + (+a.w || 0) * a.agentSup, 0) / t : 0;
}
export function perfRel(c: Ctx, ramp: number): number {
  const d = (refAvgAgent(c) / 100) * (c.s.COEF.perfUpliftFactor as number);
  const up = (phaseScope(c.a, c.s).avgAgent / 100) * (ramp / 100);
  return d ? Math.max(0, Math.min(c.s.COEF.perfRelCap as number, up / d)) : 0;
}

/** How much further adoption climbs past the last flat year (1 for horizons up to 3 years). */
function flowEndScale(c: Ctx): number {
  try {
    const e = engineNow(c), N = e.horizonMonths, end = rampAt(N, e.K), y3 = rampAt(Math.min(36, N), e.K);
    return y3 > 1e-9 && isFinite(end / y3) ? end / y3 : 1;
  } catch { return 1; }
}

/** F-FLOW-1: a measured override takes precedence; else the lead-time anchor by horizon-end adoption, throttled by the supervision cap. */
export function flowCycleTime(c: Ctx, m: ModelResult = model(c)) {
  const fl = flowOf(c.s.MODEL), asis = daGet(c, 'leadTime').asis;
  if (fl.cycleTime > 0) return { asis, ct: fl.cycleTime, source: 'measured' as const, throttle: 1 };
  const e = engineNow(c), n = m.yearAgentVfteRaw.length - 1;
  const raw = m.yearAgentVfteRaw[n] as number, eff = m.yearAgentVfte[n] as number;
  const throttle = raw > 1e-9 ? Math.min(1, eff / raw) : 1;
  const a = daGet(c, 'leadTime');
  return { asis, ct: anchorClamp(a.asis, a.target, perfRel(c, e.year(e.horizonYears).adoptionEndPct) * throttle), source: 'derived' as const, throttle };
}

/** Full P5 read-out: cycle time, Little's-law WIP and the sponsor-owned time-to-market value. */
export function flowModel(c: Ctx) {
  const m = model(c), fl = flowOf(c.s.MODEL), ct = flowCycleTime(c, m), e = engineNow(c);
  const wip = (m.yearArtMonth[m.yearArtMonth.length - 1] as number) * flowEndScale(c) * (ct.ct / 30);
  const theta = ct.asis > 0 ? Math.max(0, (ct.asis - ct.ct) / ct.asis) : 0;
  const deltaTRaw = (ct.asis - ct.ct) / 30;
  const share = Math.max(0, Math.min(100, fl.throughputInShare || 0)) / 100, deltaTEff = deltaTRaw * share;
  const margin = Math.max(0, fl.marginPerMonth || 0), d = Math.max(0, Math.min(1, numOr(fl.discountRate, 0.08)));
  let npv = 0;
  if (margin > 0 && deltaTEff !== 0) for (let mo = 1; mo <= m.horizon * 12; mo++) npv += (margin * deltaTEff) / Math.pow(1 + d, mo / 12);
  return {
    on: !!c.s.MODEL.FLAGS.flow, hasMargin: fl.marginPerMonth > 0, ctAsis: ct.asis, ctNew: ct.ct, ctSource: ct.source, throttle: ct.throttle, theta, wip,
    wipMeasured: fl.wip > 0 ? fl.wip : null, deltaTRaw, deltaTEff, share, margin, discountRate: d, flowNpv: npv,
    combinedY3Value: e.year(e.horizonYears).savings + npv, endLabel: `Y${e.horizonYears}`,
  };
}
