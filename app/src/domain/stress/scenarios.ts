/** @calc-zone stress */
import { LOCATIONS } from '../catalog';
import type { Ctx } from '../ctx';
import { headlineOf } from '../economics/headline';
import { rateFor, targetBlendedTJM } from '../location';
import { activeCurve } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { timeFor, type Engine } from '../time';
import type { Levers } from '../time/kernel';
import type { YearRow } from '../time/years';
import type { ColourRole } from '../theme';

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

/** The scenario's Time Engine: the case's own engine with the scenario's levers (the portfolio consolidation lays its months on the calendar). */
export const scenarioEngine = (c: Ctx, o: ScenOpts, raw = modelRaw(c)): Engine =>
  timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: raw, levers: scenarioLevers(c, o) });

/** Generic scenario model: the case's own Time Engine run with the levers switched by `opts` (no second implementation of the economics). */
export function scenarioModel(c: Ctx, opts: Partial<ScenOpts>) {
  const o: ScenOpts = { ai: true, loc: 'target', frPerYear: 0, ...opts };
  const raw = modelRaw(c), base = raw.base, eng = scenarioEngine(c, o, raw);
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

export interface Scenario { key: 'asis' | 'ai' | 'loc' | 'ramp' | 'ailoc' | 'aidst'; label: string; tone: ColourRole; m: ScenarioResult }

export type ScenarioDef = Omit<Scenario, 'm'> & { opts: ScenOpts };

/** The six scenarios' identities and levers, in display order (shared by the product view and the portfolio consolidation). */
export function scenarioDefs(c: Ctx): ScenarioDef[] {
  const frPer = c.inp.p('scenFrPerYear'), dst = scenTargetLocName(c);
  const d = (key: Scenario['key'], label: string, tone: ColourRole, ai: boolean, loc: ScenLoc, frPerYear = 0): ScenarioDef =>
    ({ key, label, tone, opts: { ai, loc, frPerYear } });
  return [
    d('asis', 'AS-IS', 'slate-700', false, 'asis'), d('ai', 'AI only', 'info-700', true, 'asis'), d('loc', 'Location only', 'warning-600', false, 'target'),
    d('ramp', `Ramp to ${dst} (${frPer}%/yr)`, 'warning-550', false, 'ramp', frPer), d('ailoc', 'AI + Location', 'teal-700', true, 'target'),
    d('aidst', `AI + 100% ${dst}`, 'primary-700', true, 'destination'),
  ];
}

/** The six scenarios, in display order. */
export const scenarioSet = (c: Ctx): Scenario[] => scenarioDefs(c).map(({ opts, ...s }) => ({ ...s, m: scenarioModel(c, opts) }));
export const SCENARIO_DESTINATIONS = LOCATIONS.map((l) => ({ name: l.name, cls: l.cls }));
