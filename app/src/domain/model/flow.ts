/** @calc-zone delivery-views */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { DEFAULT_DISCOUNT_RATE, npvOf } from '../economics/cashflow';
import { anchorClamp, daGet } from '../verifyB/anchors';
import { perfRel } from '../verifyB/perf';
import { rampAt } from '../time/adapters';
import type { ModelResult } from '../types/model';
import { flowOf, numOr } from './modelState';
import { model } from './overlay';

/** How much further adoption climbs past the last flat year (1 for horizons up to 3 years). */
function flowEndScale(c: Ctx): number {
  try {
    const e = engineNow(c), N = e.horizonMonths, end = rampAt(N, e.K), y3 = rampAt(Math.min(36, N), e.K);
    return y3 > 1e-9 && isFinite(end / y3) ? end / y3 : 1;
  } catch { return 1; }
}

/** F-FLOW-1: a measured override takes precedence; else the lead-time anchor by horizon-end adoption, throttled by the supervision cap. */
export function flowCycleTime(c: Ctx, m: ModelResult = model(c)) {
  const fl = flowOf(c.s.MODEL), asis = daGet(c.s, 'leadTime').asis;
  if (fl.cycleTime > 0) return { asis, ct: fl.cycleTime, source: 'measured' as const, throttle: 1 };
  const e = engineNow(c), n = m.yearAgentVfteRaw.length - 1;
  const raw = m.yearAgentVfteRaw[n] as number, eff = m.yearAgentVfte[n] as number;
  const throttle = raw > 1e-9 ? Math.min(1, eff / raw) : 1;
  const a = daGet(c.s, 'leadTime');
  return { asis, ct: anchorClamp(a.asis, a.target, perfRel(c, e.year(e.horizonYears).adoptionEndPct) * throttle), source: 'derived' as const, throttle };
}

/** Full P5 read-out: cycle time, Little's-law WIP and the sponsor-owned time-to-market value. */
export function flowModel(c: Ctx) {
  const m = model(c), fl = flowOf(c.s.MODEL), ct = flowCycleTime(c, m), e = engineNow(c);
  const wip = (m.yearArtMonth[m.yearArtMonth.length - 1] as number) * flowEndScale(c) * (ct.ct / 30);
  const theta = ct.asis > 0 ? Math.max(0, (ct.asis - ct.ct) / ct.asis) : 0;
  const deltaTRaw = (ct.asis - ct.ct) / 30;
  const share = Math.max(0, Math.min(100, fl.throughputInShare || 0)) / 100, deltaTEff = deltaTRaw * share;
  const margin = Math.max(0, fl.marginPerMonth || 0), d = Math.max(0, Math.min(1, numOr(fl.discountRate, DEFAULT_DISCOUNT_RATE)));
  // the time-to-market value: a constant monthly margin over the horizon, discounted with ANNUAL compounding (1 + d)^(month / 12) (legacy P5 rule)
  const npv = margin > 0 && deltaTEff !== 0 ? npvOf(new Array<number>(m.horizon * 12).fill(margin * deltaTEff), d, 'annual') : 0;
  return {
    on: !!c.s.MODEL.FLAGS.flow, hasMargin: fl.marginPerMonth > 0, ctAsis: ct.asis, ctNew: ct.ct, ctSource: ct.source, throttle: ct.throttle, theta, wip,
    wipMeasured: fl.wip > 0 ? fl.wip : null, deltaTRaw, deltaTEff, share, margin, discountRate: d, flowNpv: npv,
    combinedY3Value: e.year(e.horizonYears).savings + npv, endLabel: `Y${e.horizonYears}`,
  };
}
