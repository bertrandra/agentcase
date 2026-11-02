/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { hriDaysPerFTE, hriEnabled } from '../engagement';
import { caseHorizonYears } from '../inputs';
import { khEnabled, khSetupCost } from '../knowledge';
import { targetBlendedTJM, teamInCost } from '../location';
import { AI_SKILL_PREMIUM } from '../rates';
import { shapeLine } from './costProfile';
import { amountOf, PRICING_KEYS, pricingOf, type Pricing } from './pricing';
import { sizingDefault } from './sizing';
export { PRICING_KEYS, pricingOf, type Pricing } from './pricing';
import { OPT_INS, optInMonths, optInOn, optInPlan, type OptInId } from './optIn';
import { hubSetupTiming, lineMonths, pilotTiming, setupMonths, spreadMonths } from './timing';

/**
 * The ONE monthly cost profile of the transformation programme (docs/SPEC_BPMN.md § 19.3, F-B68; docs/PROGRAMME_SIZING_DMN.md, the normalised
 * form A × Q × P × D over a window): the Time Engine's setup rows, the setup breakdown (the ROI's setup), the cost model and the programme process
 * read it. Labour: days × the role rate (the target blended day rate, moved by a Monte Carlo rate draw, × the AI-skill premium); amounts: € spent
 * over their window (moved by the amount draw, #9). Placement: product months, 1 = the build's first month, ≤ 0 before the build.
 */
export type CoreLineId = 'tooling' | 'pilot' | 'training' | 'coaching' | 'governance' | 'change' | 'knowledge';
export type ProgrammeLineId = CoreLineId | OptInId;
export type LineRule = 'nonLabour' | 'resources' | 'engine';
export interface ProgrammeLine {
  id: ProgrammeLineId; label: string; rule: LineRule; level: 'case' | 'product'; amount: number;
  /** the labour behind it in days (null: not labour) */
  effortDays: number | null;
  /** product month of the first spend, and the spend month by month from there (adds up to `amount`) */
  from: number; months: number[];
  /** months of its duration (fractional; set by the profile, B9e) */
  duration?: number;
  /** a saving the line brings (normalisation #7: an output of its own, never a negative cost): € a month from a product month */
  saving?: { from: number; perMonth: number };
}
/** Resource defaults (§ 19.3): trainers (preceptors) and the Design Authority's governance effort over their duration. */
export const TRAIN_FTE = sizingDefault('trainFte'), GOV_FTE = sizingDefault('govFte');
const num = (c: Ctx, key: string, def: number): number => { const n = c.inp.p(key); return !isNaN(n) && n >= 0 ? n : def; };

/**
 * Engagement change cost (HRI; normalisation #4, owner 2026-11-02): entry headcount × days per head of the readiness band × the role rate, 0 when
 * the HRI module is off. The band's days (`hriDaysLight` / `Std` / `Int`) follow the rate card and its Monte Carlo draw.
 */
export const convChangeCost = (c: Ctx): number => (hriEnabled(c) ? teamInCost(c.s, c.inp).etp * hriDaysPerFTE(c) * programmeRates(c).role : 0);
/** The programme's rates: the target blended day rate, the role rate (× the AI-skill premium) and the working days of a year. */
export function programmeRates(c: Ctx): { tjm: number; role: number; wd: number } {
  const tjm = targetBlendedTJM(c.s, c.rateScale), wd = c.inp.p('workdays') || 220;
  return { tjm, role: tjm * AI_SKILL_PREMIUM, wd };
}
/** The coaching load (% of the entry team's capacity) of horizon year y (1-based): Y1, then halfway, then cruise — the EV-19 curve, informative only
 * (the Maturity screen's context; D-B30 revised 2026-10-31: not priced). */
export function coachLoad(c: Ctx, y: number): number {
  const y1 = c.inp.p('coachY1'), cr = c.inp.p('coachCruise'), a = isNaN(y1) ? 40 : y1, z = isNaN(cr) ? 20 : cr;
  return y <= 1 ? a : y === 2 ? (a + z) / 2 : z;
}
const line = (id: ProgrammeLineId, label: string, rule: LineRule, level: 'case' | 'product', amount: number, effortDays: number | null, from: number,
  months: number[]): ProgrammeLine => ({ id, label, rule, level, amount, effortDays, from, months });
/**
 * A resources line: `fte` over `months` (capped at the horizon) from product month 1, at the role rate. Training and governance priced by amount
 * (FX-D13 d): their euro amount (`setupTraining`, `setupGov`) is the cost, spent over the same duration, with no labour behind it (no rate draw).
 */
function resources(c: Ctx, id: 'training' | 'governance', label: string, fte: number, durationKey: string, H: number): [ProgrammeLine, number] {
  const r = programmeRates(c), m = Math.min(lineMonths(c, durationKey), H);
  if (pricingOf(c, id) === 'amount') {
    const amount = amountOf(c, PRICING_KEYS[id].amount);
    return [line(id, label, 'nonLabour', 'product', amount, null, 1, spreadMonths(amount, m)), m];
  }
  const days = fte * m * (r.wd / 12), cost = days * r.role;
  return [line(id, label, 'resources', 'product', cost, days, 1, spreadMonths(cost, m)), m];
}
/** Coaching days a month by default (D-B30, revised 2026-10-31). */
export const COACH_DAYS_PER_MONTH = sizingDefault('coachDaysPerMonth');
export interface CoachingPlan { perMonth: number; months: number; days: number; amount: number; pricing: Pricing }
/**
 * The coaching activity (D-B30; normalisation #3: an explicit pricing mode, like training and governance). Resources: `coachDaysPerMonth`
 * (default 2) × `coachMonths` (else the setup duration) × the role rate. Amount: the `setupCoaching` € spent over the same months, no labour
 * behind it. Without a mode, a case without a duration is priced by its amount (the total of the legacy calibration).
 */
export function coachingPlan(c: Ctx): CoachingPlan {
  const r = programmeRates(c), perMonth = num(c, 'coachDaysPerMonth', COACH_DAYS_PER_MONTH), entered = c.inp.p('coachMonths');
  const pricing = pricingOf(c, 'coaching'), implicit = pricing === 'amount' && c.inp.v('coachPricing') !== 'amount';
  // an amount without a chosen mode keeps the legacy calibration's duration (amount / role rate / days a month): the same months, the same total
  const legacyMonths = perMonth > 0 ? amountOf(c, 'setupCoaching') / r.role / perMonth : setupMonths(c);
  const months = !isNaN(entered) && entered > 0 ? entered : implicit ? legacyMonths : setupMonths(c);
  if (pricing === 'amount') return { perMonth: 0, months, days: 0, amount: amountOf(c, 'setupCoaching'), pricing };
  if (!(perMonth > 0)) return { perMonth: 0, months: 0, days: 0, amount: 0, pricing };
  return { perMonth, months, days: perMonth * months, amount: perMonth * months * r.role, pricing };
}
function coaching(c: Ctx, H: number): [ProgrammeLine, number] {
  const p = coachingPlan(c), m = Math.min(p.months, H), rule: LineRule = p.pricing === 'amount' ? 'nonLabour' : 'resources';
  return [line('coaching', 'Coaching', rule, 'product', p.amount, p.pricing === 'amount' ? null : p.days, 1, spreadMonths(p.amount, m)), m];
}

/**
 * The pilot (D-B28; normalisation #1, owner 2026-11-02): labour at the role rate like every programme activity, IN the euro result, placed before
 * the build (it ends at the product's month 0; a single case books it from month 1).
 */
export function pilotLine(c: Ctx): { fte: number; cost: number; days: number; from: number; months: number[]; monthsLong: number } {
  const t = pilotTiming(c), entered = c.inp.p('pilotFte'), fte = !isNaN(entered) && entered >= 0 ? entered : sizingDefault('pilotFte');   // 0: no pilot
  const r = programmeRates(c), days = fte * (t.totalWeeks / 52) * r.wd;
  const cost = days * r.role;
  return { fte, cost, days, from: 1 - t.leadMonths, months: spreadMonths(cost, t.months), monthsLong: t.months };
}

/** The horizon in months of a case (the programme is spent inside it). */
export const horizonMonthsOf = (c: Ctx): number => caseHorizonYears(c.inp) * 12;
/** The programme lines in the euro result: tooling, training, coaching, governance, change (HRI on), hub setup (hub on), the opt-in activities on;
 * each laid on its months by its type (`costProfile.ts`, B9e; `spread` by default, the B9b rule). */
export function programmeLines(c: Ctx, H = horizonMonthsOf(c)): ProgrammeLine[] {
  const setup = Math.min(lineMonths(c, null), H), tooling = amountOf(c, 'setupTooling'), change = convChangeCost(c), r = programmeRates(c);
  const pilot = pilotLine(c);
  const out: [ProgrammeLine, number][] = [
    [line('tooling', 'Tooling & infra', 'nonLabour', 'product', tooling, null, 1, spreadMonths(tooling, setup)), setup],
    resources(c, 'training', 'Training', num(c, 'trainFte', TRAIN_FTE), 'trainMonths', H),
    coaching(c, H),
    resources(c, 'governance', 'Governance', num(c, 'govFte', GOV_FTE), 'govMonths', H),
  ];
  if (hriEnabled(c)) out.push([line('change', 'Change management (HRI)', 'engine', 'product', change, null, 1, spreadMonths(change, setup)), setup]);
  if (khEnabled(c)) {
    const kh = khSetupCost(c) * (c.amountScale ?? 1), m = Math.min(hubSetupTiming(c).months, H);
    out.push([line('knowledge', 'Knowledge hub setup', 'resources', 'product', kh, r.tjm > 0 ? kh / r.tjm : null, 1, spreadMonths(kh, m)), m]);
  }
  out.push([line('pilot', 'Pilot', 'resources', 'product', pilot.cost, pilot.days, pilot.from, pilot.months), pilot.monthsLong]);
  for (const d of OPT_INS) {
    if (!optInOn(c, d)) continue;
    const p = optInPlan(c, d.id, H, r.wd), cost = p.days * r.role, l = line(d.id, d.label, 'resources', d.level, cost, p.days, p.from, optInMonths(cost, p));
    out.push([p.saving ? { ...l, saving: p.saving } : l, p.months]);
  }
  return out.map(([l, m]) => shapeLine(c, l, m, H));
}

/** A line laid on the product's own months 1..H: a spend before the build starts at month 1 (a single case has no earlier month), a spend past the
 * horizon is booked in its last month, so the months add up to the line's amount. Index t - 1 = month t. */
export function lineOnMonths(l: Pick<ProgrammeLine, 'from' | 'months'>, H: number): number[] {
  const out = new Array<number>(H).fill(0), start = Math.max(1, l.from);
  if (H > 0) l.months.forEach((x, k) => { out[Math.min(H, start + k) - 1]! += x; });
  return out;
}
/** What the Time Engine reads: the programme cost per month (all lines), its hub-setup part, and the savings of the opt-in lines (decommissioning). */
export interface EngineProfile { setup: number[]; kt: number[]; saving: number[] }
export function engineProfile(c: Ctx, H = horizonMonthsOf(c)): EngineProfile {
  const setup = new Array<number>(H).fill(0), saving = new Array<number>(H).fill(0);
  let kt = new Array<number>(H).fill(0);
  for (const l of programmeLines(c, H)) {
    const m = lineOnMonths(l, H);
    m.forEach((x, i) => { setup[i]! += x; });
    if (l.id === 'knowledge') kt = m;
    if (l.saving) for (let t = l.saving.from; t <= H; t++) saving[t - 1]! += l.saving.perMonth;   // #7: the line's own output
  }
  return { setup, kt, saving };
}
