/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { curveOf, ensurePts } from '../scope/scurve';
import { optInOfKind } from './optIn';
import { spreadMonths } from './timing';

/**
 * The cost profile (type) of a programme activity (docs/SPEC_BPMN.md § 19.11 F-B79; phase B9e): how its cost is laid on the months, read by the
 * programme's one monthly cost profile (`profile.ts`), so the engine, the cost model, the Gantt and the histogram follow it. Stored on the activity
 * (`ac:costProfile` in the BPMN export); in B9e the value lives in a case key per cost line (`costProfile_<line>`), beside the opt-in switches of
 * B9b, until B9c moves both into the document. The default of every line is `spread`, the rule B9b uses, so opening a case changes no figure.
 */
export type CostProfile = 'one-off' | 'spread' | 'adoption' | 'recurring' | 'none';
export interface CostProfileDef { id: CostProfile; label: string; text: string }
export const COST_PROFILES: readonly CostProfileDef[] = [
  { id: 'one-off', label: 'One-off', text: 'The whole cost in one month, the first month of its placement' },
  { id: 'spread', label: 'Spread', text: 'Evenly over its duration, the last month pro rata (the B9b rule)' },
  { id: 'adoption', label: 'Spread on adoption curve', text: 'Over its duration along the product\'s S-curve: each month carries the adoption gained in '
    + 'that month (evenly when the curve gains nothing there)' },
  { id: 'recurring', label: 'Recurring', text: 'Its cost over its duration, charged again every 12 months from its start up to the horizon' },
  { id: 'none', label: 'Milestone', text: 'No cost: a gate or a milestone' },
];
/** The types a cost line of the profile can take (a milestone has no cost line). */
export const LINE_PROFILES: readonly CostProfile[] = ['one-off', 'spread', 'adoption', 'recurring'];
export const costProfileLabel = (p: CostProfile): string => COST_PROFILES.find((d) => d.id === p)!.label;

/** The cost line of the profile that carries each core activity's cost; the opt-in activities carry their opt-in's line (`optIn.ts`). */
const CORE_LINE: Record<string, string> = {
  setupTooling: 'tooling', setupTraining: 'training', setupCoaching: 'coaching', setupGovernance: 'governance', change: 'change', hubSetup: 'knowledge',
};
/** The cost line of an activity kind (null: its cost is not a line of the programme profile: pilot, engine figures, milestones). */
export const lineOfKind = (kind: string): string | null => CORE_LINE[kind] ?? optInOfKind(kind)?.id ?? null;
/** The case key that holds a cost line's type until B9c. */
export const costProfileKey = (line: string): string => `costProfile_${line}`;
/** A cost line's type: the stored value when it is one of the line types, else `spread` (the B9b rule). */
export function lineProfile(c: Ctx, line: string): CostProfile {
  const v = c.inp.v(costProfileKey(line)) as CostProfile;
  return LINE_PROFILES.includes(v) ? v : 'spread';
}

/** The adoption gained in each product month t (curve(t) − curve(t − 1), 0 before the build), from the case's S-curve over `H` months. */
function adoptionGain(c: Ctx, H: number): (t: number) => number {
  const sc = c.s.scurve, pts = ensurePts(sc?.pts, Math.max(1, H), [1, 2, 3].map((i) => c.inp.p(`y${i}Ramp`)));
  const curve = curveOf(sc?.family ?? 'spline', pts);
  return (t) => (t < 1 ? 0 : Math.max(0, curve(t) - curve(t - 1)));
}
/** `amount` over `months` from product month `from`, entry k weighted by w(k) × min(1, months − k); evenly when the weights add up to nothing. */
function weighted(amount: number, months: number, from: number, w: (t: number) => number): number[] {
  const even = spreadMonths(amount, months), ws = even.map((_, k) => w(from + k) * Math.min(1, months - k)), sum = ws.reduce((a, x) => a + x, 0);
  return sum > 0 ? ws.map((x) => (amount * x) / sum) : even;
}
/** A recurring cost: the spread of one cycle at months 0, 12, 24… from its first month; what a later cycle would spend after the horizon `H`
 * is not charged (the first cycle keeps the B9b rule: a spend past the horizon is booked in its last month). */
function recurring(amount: number, months: number, from: number, H: number): number[] {
  const one = spreadMonths(amount, months), start = Math.max(1, from), out: number[] = [];
  for (let j = 0; j === 0 || start + 12 * j <= H; j++) {
    one.forEach((x, i) => { const k = 12 * j + i; if (j === 0 || start + k <= H) out[k] = (out[k] ?? 0) + x; });
  }
  return Array.from(out, (x) => x ?? 0);
}

/**
 * A line's spend month by month from its first month (`from`, a product month), by type: one-off (all at `from`), spread (the B9b rule,
 * `spreadMonths`), adoption (the S-curve's gain), recurring (a cycle a year to the horizon). Empty without an amount.
 */
export function profiledMonths(c: Ctx, p: CostProfile, amount: number, months: number, from: number, H: number): number[] {
  if (!(amount !== 0) || !isFinite(amount) || p === 'none') return [];
  switch (p) {
    case 'one-off': return [amount];
    case 'adoption': return weighted(amount, months, from, adoptionGain(c, H));
    case 'recurring': return recurring(amount, months, from, H);
    default: return spreadMonths(amount, months);
  }
}

/** A line shaped by its type: unchanged for `spread` (B9b exactly); a recurring line's amount and effort are what its cycles add up to. */
export function shapeLine<T extends { id: string; amount: number; effortDays: number | null; from: number; months: number[]; duration?: number }>(c: Ctx,
  l: T, duration: number, H: number): T {
  const p = lineProfile(c, l.id);
  if (p === 'spread') return { ...l, duration };
  const months = profiledMonths(c, p, l.amount, duration, l.from, H), amount = months.reduce((a, x) => a + x, 0), f = l.amount ? amount / l.amount : 1;
  return { ...l, duration, months, amount: p === 'recurring' ? amount : l.amount, effortDays: p === 'recurring' && l.effortDays !== null ? l.effortDays * f
    : l.effortDays };
}

/** The type of an activity kind that is not a cost line: the rule its owner applies (read-only), as B9b lays it. */
const FIXED: Record<string, CostProfile> = { pilot: 'spread', 'stage-pilotProve': 'spread', build: 'adoption', run: 'recurring', agentops: 'recurring',
  hubRun: 'recurring' };
export interface ActivityType { profile: CostProfile; line: string | null; editable: boolean }
/** An activity's type: its cost line's (editable), the hub setup's for the knowledge-transfer preparation, a fixed rule, or a milestone. */
export function activityType(c: Ctx, kind: string): ActivityType {
  const line = lineOfKind(kind);
  if (line) return { profile: lineProfile(c, line), line, editable: true };
  if (kind === 'ktPrep') return { profile: lineProfile(c, 'knowledge'), line: null, editable: false };
  return { profile: FIXED[kind] ?? 'none', line: null, editable: false };
}
