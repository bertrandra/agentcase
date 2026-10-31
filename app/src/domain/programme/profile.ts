/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { hriCostPerFTE, hriEnabled } from '../engagement';
import { caseHorizonYears } from '../inputs';
import { khEnabled, khSetupCost } from '../knowledge';
import { targetBlendedTJM, teamInCost } from '../location';
import { AI_SKILL_PREMIUM } from '../rates';
import { OPT_INS, optInMonths, optInOn, optInPlan, type OptInId } from './optIn';
import { hubSetupTiming, lineMonths, pilotTiming, spreadMonths } from './timing';

/**
 * The ONE monthly cost profile of the transformation programme (docs/SPEC_BPMN.md § 19.3, § 19.4 F-B68; phase B9b), built from its activities:
 * the Time Engine's setup rows (`time/kernel.ts`), the setup breakdown (`tuneB/setup.ts`, the ROI's setup), the cost model and the programme
 * process read it. Labour is derived from resources (§ 19.3): role FTE × duration × the programme's role rate, the target blended day rate of the
 * rate card and the target location mix (the SDLC's own, `targetBlendedTJM`, moved by a Monte Carlo rate draw) × the AI-skill premium of the
 * transitional roles. Tooling is a non-labour amount, the change management keeps its engine formula (HRI), the hub setup its formula (parity);
 * coaching follows its curve (D-B30). Placement: product months, 1 = the build's first month, ≤ 0 before the build.
 */
export type CoreLineId = 'tooling' | 'training' | 'coaching' | 'governance' | 'change' | 'knowledge';
export type ProgrammeLineId = CoreLineId | OptInId;
export type LineRule = 'nonLabour' | 'resources' | 'curve' | 'engine';
export interface ProgrammeLine {
  id: ProgrammeLineId; label: string; rule: LineRule; level: 'case' | 'product'; amount: number;
  /** the labour behind it in days (null: not labour) */
  effortDays: number | null;
  /** product month of the first spend, and the spend month by month from there (adds up to `amount`) */
  from: number; months: number[];
}
/** Resource defaults (§ 19.3): trainers (preceptors) and the Design Authority's governance effort over their duration. */
export const TRAIN_FTE = 0.5, GOV_FTE = 0.25;
const num = (c: Ctx, key: string, def: number): number => { const n = c.inp.p(key); return !isNaN(n) && n >= 0 ? n : def; };

/** Engagement change cost (HRI): entry headcount × cost per FTE of the readiness intensity, 0 when the HRI module is off (engine formula kept). */
export const convChangeCost = (c: Ctx): number => (hriEnabled(c) ? teamInCost(c.s, c.inp).etp * hriCostPerFTE(c) : 0);
/** The programme's rates: the target blended day rate, the role rate (× the AI-skill premium) and the working days of a year. */
export function programmeRates(c: Ctx): { tjm: number; role: number; wd: number } {
  const tjm = targetBlendedTJM(c.s, c.rateScale), wd = c.inp.p('workdays') || 220;
  return { tjm, role: tjm * AI_SKILL_PREMIUM, wd };
}
/** The coaching load (% of the entry team's capacity) of horizon year y (1-based): Y1, then halfway, then cruise (EV-19 curve). */
export function coachLoad(c: Ctx, y: number): number {
  const y1 = c.inp.p('coachY1'), cr = c.inp.p('coachCruise'), a = isNaN(y1) ? 40 : y1, z = isNaN(cr) ? 20 : cr;
  return y <= 1 ? a : y === 2 ? (a + z) / 2 : z;
}
const line = (id: ProgrammeLineId, label: string, rule: LineRule, level: 'case' | 'product', amount: number, effortDays: number | null, from: number,
  months: number[]): ProgrammeLine => ({ id, label, rule, level, amount, effortDays, from, months });
/** A resources line: `fte` over `months` (capped at the horizon) from product month 1, at the role rate. */
function resources(c: Ctx, id: CoreLineId, label: string, fte: number, durationKey: string, H: number): ProgrammeLine {
  const r = programmeRates(c), m = Math.min(lineMonths(c, durationKey), H), days = fte * m * (r.wd / 12), cost = days * r.role;
  return line(id, label, 'resources', 'product', cost, days, 1, spreadMonths(cost, m));
}
function coaching(c: Ctx, H: number): ProgrammeLine {
  const r = programmeRates(c), etp = teamInCost(c.s, c.inp).etp;
  const days = Array.from({ length: H }, (_, i) => etp * (coachLoad(c, Math.floor(i / 12) + 1) / 100) * (r.wd / 12));
  const months = days.map((d) => d * r.tjm), amount = months.reduce((a, x) => a + x, 0);
  return line('coaching', 'Coaching', 'curve', 'product', amount, days.reduce((a, x) => a + x, 0), 1, months);
}

/** The horizon in months of a case (the programme is spent inside it). */
export const horizonMonthsOf = (c: Ctx): number => caseHorizonYears(c.inp) * 12;
/** The programme lines in the euro result: tooling, training, coaching, governance, change (HRI on), hub setup (hub on), the opt-in activities on. */
export function programmeLines(c: Ctx, H = horizonMonthsOf(c)): ProgrammeLine[] {
  const setup = Math.min(lineMonths(c, null), H), tooling = c.inp.p('setupTooling') || 0, change = convChangeCost(c), r = programmeRates(c);
  const out: ProgrammeLine[] = [
    line('tooling', 'Tooling & infra', 'nonLabour', 'product', tooling, null, 1, spreadMonths(tooling, setup)),
    resources(c, 'training', 'Training', num(c, 'trainFte', TRAIN_FTE), 'trainMonths', H),
    coaching(c, H),
    resources(c, 'governance', 'Governance', num(c, 'govFte', GOV_FTE), 'govMonths', H),
  ];
  if (hriEnabled(c)) out.push(line('change', 'Change management (HRI)', 'engine', 'product', change, null, 1, spreadMonths(change, setup)));
  if (khEnabled(c)) {
    const kh = khSetupCost(c), m = Math.min(hubSetupTiming(c).months, H);
    out.push(line('knowledge', 'Knowledge hub setup', 'resources', 'product', kh, r.tjm > 0 ? kh / r.tjm : null, 1, spreadMonths(kh, m)));
  }
  for (const d of OPT_INS) {
    if (!optInOn(c, d)) continue;
    const p = optInPlan(c, d.id, H, r.wd), cost = p.days * r.role;
    out.push(line(d.id, d.label, 'resources', d.level, cost, p.days, p.from, optInMonths(cost, p)));
  }
  return out;
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
  }
  const dec = OPT_INS.find((d) => d.id === 'decommission')!;
  if (optInOn(c, dec)) {
    const p = optInPlan(c, 'decommission', H, programmeRates(c).wd);
    if (p.saving) for (let t = p.saving.from; t <= H; t++) saving[t - 1] = p.saving.perMonth;
  }
  return { setup, kt, saving };
}

/** The pilot (resources, parity): its cost spread over its weeks, placed before the build (D-B28); NOT in the euro result (DEV-COSTMODEL-PILOT). */
export function pilotLine(c: Ctx): { fte: number; cost: number; days: number; from: number; months: number[] } {
  const t = pilotTiming(c), fte = c.inp.p('pilotFte') || 3, r = programmeRates(c), days = fte * (t.totalWeeks / 52) * r.wd, cost = days * (r.tjm || 600);
  return { fte, cost, days, from: 1 - t.leadMonths, months: spreadMonths(cost, t.months) };
}