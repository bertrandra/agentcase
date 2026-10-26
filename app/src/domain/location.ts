/** @calc-zone rate-card-team */
import { LOCATIONS } from './catalog';
import type { Inputs } from './inputs';
import type { CaseState } from './types/state';

export const gradeBand = (g: string): string => g[0] ?? '';
const isKnownLoc = (loc: string) => LOCATIONS.some((l) => l.name === loc);
const locClass = (loc: string) => LOCATIONS.find((l) => l.name === loc)?.cls ?? 'Local';

/** Day rate of a location/grade; 400 when the table has no valid entry (legacy default). */
export function rateFor(s: CaseState, loc: string, grade: string): number {
  const r = isKnownLoc(loc) ? s.RATE[loc] : undefined;
  const v = r && Object.prototype.hasOwnProperty.call(r, gradeBand(grade)) ? r[gradeBand(grade)] : undefined;
  return typeof v === 'number' && isFinite(v) && v >= 0 ? v : 400;
}

export function locationMix(s: CaseState) {
  const byLoc: Record<string, number> = {}, byClass: Record<string, number> = { Local: 0, Nearshore: 0, Offshore: 0 };
  let tot = 0;
  LOCATIONS.forEach((l) => { byLoc[l.name] = 0; });
  s.teamIn.forEach((r) => { byLoc[r.loc] = (byLoc[r.loc] || 0) + r.etp; byClass[locClass(r.loc)] = (byClass[locClass(r.loc)] ?? 0) + r.etp; tot += r.etp; });
  const pct: Record<string, number> = {};
  LOCATIONS.forEach((l) => { pct[l.name] = tot ? ((byLoc[l.name] ?? 0) / tot) * 100 : 0; });
  return { byLoc, byClass, tot, pct };
}

/** Annual cost of one team line: FTE × day rate of its location / grade × working days. */
export const lineCost = (s: CaseState, inp: Inputs, r: CaseState['teamIn'][number]): number => r.etp * rateFor(s, r.loc, r.grade) * inp.p('workdays');

export function teamInCost(s: CaseState, inp: Inputs) {
  let etp = 0, cost = 0;
  s.teamIn.forEach((r) => { etp += r.etp; cost += lineCost(s, inp, r); });
  return { etp, cost };
}

/** The AS-IS blended day rate: team cost / (FTE × working days), 0 without FTE (the one owner: model().blendedTJM, the team summary, loc strategy). */
export function blendedDayRate(s: CaseState, inp: Inputs): number {
  const t = teamInCost(s, inp), wd = inp.p('workdays');
  return t.etp * wd > 0 ? t.cost / (t.etp * wd) : 0;
}

/** Entry FTE by skill, in the order the skills first appear in the team. */
export function fteBySkill(s: CaseState): Record<string, number> {
  const sk: Record<string, number> = {};
  s.teamIn.forEach((r) => { sk[r.skill] = (sk[r.skill] || 0) + r.etp; });
  return sk;
}

function locBlendedTJM(s: CaseState, loc: string): number {
  const res = s.teamIn.filter((r) => r.loc === loc);
  if (res.length) {
    let e = 0, c = 0;
    res.forEach((r) => { e += r.etp; c += r.etp * rateFor(s, r.loc, r.grade); });
    return e ? c / e : rateFor(s, loc, 'C1');
  }
  return rateFor(s, loc, 'C1');
}

/** Blended day rate of the target location strategy. `rateScale` is the Monte-Carlo multiplier (null outside MC). */
export function targetBlendedTJM(s: CaseState, rateScale: number | null = null): number {
  let target = s.targetLocPct;
  if (!target) {
    const mx = locationMix(s);
    target = {};
    LOCATIONS.forEach((l) => { (target as Record<string, number>)[l.name] = Math.round((mx.pct[l.name] ?? 0) * 10) / 10; });
  }
  let sum = 0, w = 0;
  LOCATIONS.forEach((l) => { const p = (target as Record<string, number>)[l.name] || 0; sum += p * locBlendedTJM(s, l.name); w += p; });
  const base = w ? sum / w : 400;
  return rateScale != null ? base * rateScale : base;
}
