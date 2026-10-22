/** @calc-zone stress */
import { LOCATIONS } from '../catalog';
import type { Ctx } from '../ctx';
import { headlineOf } from '../economics/headline';
import { rateFor, targetBlendedTJM } from '../location';
import { activeCurve } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { timeFor } from '../time';
import type { Levers } from '../time/kernel';
import type { YearRow } from '../time/years';

export type ScenLoc = 'asis' | 'target' | 'destination' | 'ramp';
export interface ScenOpts { ai: boolean; loc: ScenLoc; frPerYear: number }

/** Destination of the relocation scenarios (the `scenTargetLoc` dropdown; France when empty). */
export const scenTargetLocName = (c: Ctx): string => c.inp.v('scenTargetLoc') || 'France';

/** Blended day rate of one location, priced on the team rows staffed there (else the C1 rate). */
function locBlendedTJM(c: Ctx, loc: string): number {
  const res = c.s.teamIn.filter((r) => r.loc === loc);
  if (res.length) {
    let e = 0, cost = 0;
    res.forEach((r) => { e += r.etp; cost += r.etp * rateFor(c.s, r.loc, r.grade); });
    return e ? cost / e : rateFor(c.s, loc, 'C1');
  }
  return rateFor(c.s, loc, 'C1');
}
export function scenTargetTJM(c: Ctx): number {
  const rate = locBlendedTJM(c, scenTargetLocName(c));
  return isFinite(rate) && rate > 0 ? rate : targetBlendedTJM(c.s);
}

/** The scenario's levers on the frozen engine constants: AI off removes agents, tokens, infra, run team, the AI quality taxes and the programme setup. */
export function scenarioLevers(c: Ctx, o: ScenOpts): Levers {
  const dst = scenTargetTJM(c);
  return {
    ...(o.ai ? {} : { eff: 0, aiActive: false, infraMonth: 0, vTaxRate: 0, loopExtRate: 0, complianceTaxRate: 0 }),
    ...(o.ai || o.loc === 'ramp' ? {} : { setupTotal: 0 }),
    ...(o.loc === 'asis' ? { rateMode: 'ramp', frPerYear: 0 } : o.loc === 'ramp' ? { rateMode: 'ramp', frPerYear: o.frPerYear, dayRateTarget: dst }
      : o.loc === 'destination' ? { dayRateTarget: dst } : {}),
  };
}

/** Generic scenario model: the case's own Time Engine run with the levers switched by `opts` (no second implementation of the economics). */
export function scenarioModel(c: Ctx, opts: Partial<ScenOpts>) {
  const o: ScenOpts = { ai: true, loc: 'target', frPerYear: 0, ...opts };
  const raw = modelRaw(c), base = raw.base;
  const eng = timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: raw, levers: scenarioLevers(c, o) });
  const h = headlineOf(eng, c), Y = eng.years(), at = (f: (y: YearRow) => number) => Y.map(f);
  const cum = [0, ...Array.from({ length: eng.horizonMonths }, (_, i) => eng.cumulativeAt(i + 1))];
  return {
    opts: o, base, setup: h.setup, net: h.net, npv: h.npv, roi: h.roi, pbMonth: h.paybackMonth, pbYear: h.paybackYear, totBen: h.totalBenefit, cum,
    yearETP: at((y) => y.humanFteEnd), yearAgentVfte: at((y) => y.agentVfteEnd), yearTeamCost: at((y) => y.teamCost), yearToken: at((y) => y.tokenCost),
    yearRun: at((y) => y.totalRunCost), yearSav: at((y) => y.savings), baselineRun: base.cost, horizon: eng.horizonYears,
    tgtTJM: raw.tgtTJM, asisTJM: raw.blendedTJM, tgtRateTJM: scenTargetTJM(c),
  };
}

export type ScenarioResult = ReturnType<typeof scenarioModel>;

export interface Scenario { key: 'asis' | 'ai' | 'loc' | 'ramp' | 'ailoc' | 'aidst'; label: string; color: string; m: ScenarioResult }

/** The six scenarios, in display order. */
export function scenarioSet(c: Ctx): Scenario[] {
  const frPer = c.inp.p('scenFrPerYear'), dst = scenTargetLocName(c);
  return [
    { key: 'asis', label: 'AS-IS', color: '#566074', m: scenarioModel(c, { ai: false, loc: 'asis' }) },
    { key: 'ai', label: 'AI only', color: '#0a6e9c', m: scenarioModel(c, { ai: true, loc: 'asis' }) },
    { key: 'loc', label: 'Location only', color: '#b04600', m: scenarioModel(c, { ai: false, loc: 'target' }) },
    { key: 'ramp', label: `Ramp to ${dst} (${frPer}%/yr)`, color: '#B5651D', m: scenarioModel(c, { ai: false, loc: 'ramp', frPerYear: frPer }) },
    { key: 'ailoc', label: 'AI + Location', color: '#006e79', m: scenarioModel(c, { ai: true, loc: 'target' }) },
    { key: 'aidst', label: `AI + 100% ${dst}`, color: '#0058AB', m: scenarioModel(c, { ai: true, loc: 'destination' }) },
  ];
}
export const SCENARIO_DESTINATIONS = LOCATIONS.map((l) => ({ name: l.name, cls: l.cls }));
