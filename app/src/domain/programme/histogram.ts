/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { opModelCompute } from '../tune/opmodel';
import { activityDef } from './catalogue';
import { laneDef, PROGRAMME_LANES, type LaneRole } from './lanes';
import { optInDef, type OptInId } from './optIn';
import { horizonMonthsOf, pilotLine, programmeLines, programmeRates, type ProgrammeLineId } from './profile';

/**
 * The ONE resource histogram of the transformation programme (docs/SPEC_BPMN.md § 19.8 F-B76, decisions D-B34, D-B37; phase B9d). The labour
 * of each programme activity is read from the programme's cost profile (`profile.ts` `programmeLines`, the profile the engine and the cost model
 * read; the pilot from `pilotLine`): its spend month by month divided by its day rate (the role rate, the rate card's target blend for the hub
 * setup and the pilot) gives person-days, so Σ days × rate is the activity's labour cost exactly (the cross-surface test). Days / (working
 * days / 12) is FTE (D-B34: FTE by default, person-days as a toggle). Stacked by role (the activity's lane). The capacity of a role is its Y1 FTE
 * in the operating model (EV-09 topology); a month above it is flagged (D-B37: a diagnostic, no levelling). Months are the product's own
 * (1 = the build's first month, ≤ 0 before the build; a spend past the horizon is booked in its last month, like the engine).
 */
export interface HistLine {
  id: ProgrammeLineId | 'pilot'; label: string; activity: string; lane: LaneRole; rate: number;
  /** person-days per month, index i = month `from + i` */
  days: number[];
  /** false: outside the euro result (the pilot, DEV-COSTMODEL-PILOT) */
  inCost: boolean;
}
export interface HistRole { lane: LaneRole; label: string; days: number[]; capacity: number | null }
export interface HistFlag { lane: LaneRole; label: string; month: number; fte: number; capacity: number }
export interface ProgrammeHistogram { from: number; to: number; wdMonth: number; lines: HistLine[]; roles: HistRole[]; flags: HistFlag[] }

const KIND: Partial<Record<ProgrammeLineId | 'pilot', string>> = {
  training: 'setupTraining', coaching: 'setupCoaching', governance: 'setupGovernance', knowledge: 'hubSetup', pilot: 'pilot',
};
const kindOf = (id: ProgrammeLineId | 'pilot'): string => KIND[id] ?? optInDef(id as OptInId).kinds[0]!;
const sum = (a: readonly number[]): number => a.reduce((s, x) => s + x, 0);

/** FTE of a number of person-days in a month. */
export const fteOf = (days: number, wdMonth: number): number => (wdMonth > 0 ? days / wdMonth : 0);

/** The programme histogram of a case (its own months). `capacityOf`: the lane capacities (default: the case's EV-09 topology in Y1). */
export function programmeHistogram(c: Ctx, H = horizonMonthsOf(c)): ProgrammeHistogram {
  const r = programmeRates(c), wdMonth = r.wd / 12, p = pilotLine(c);
  const raw = [
    ...programmeLines(c, H).filter((l) => l.rule === 'resources').map((l) => ({ id: l.id, label: l.label, from: l.from, months: l.months,
      rate: l.id === 'knowledge' ? r.tjm : r.role, inCost: true })),
    { id: 'pilot' as const, label: 'Pilot', from: p.from, months: p.months, rate: p.days > 0 ? p.cost / p.days : 0, inCost: false },
  ];
  const from = Math.min(1, ...raw.map((l) => l.from)), to = H, n = to - from + 1;
  const lines: HistLine[] = raw.map((l) => {
    const days = new Array<number>(n).fill(0), d = activityDef(kindOf(l.id))!;
    l.months.forEach((x, k) => { const m = Math.min(H, l.from + k); if (l.rate > 0) days[m - from]! += x / l.rate; });
    return { id: l.id, label: l.label, activity: d.kind, lane: d.lane, rate: l.rate, days, inCost: l.inCost };
  });
  const topo = (() => { try { return opModelCompute(c, 0); } catch { return null; } })();
  const roles = rolesOf(lines, n, (lane) => { const f = laneDef(lane).topology; return topo && f ? topo[f] : null; });
  return { from, to, wdMonth, lines, roles, flags: flagsOf(roles, from, wdMonth) };
}

/** The lines stacked by role, in lane order, with each role's capacity (FTE). Roles without labour are left out. */
export function rolesOf(lines: readonly HistLine[], n: number, capacity: (lane: LaneRole) => number | null): HistRole[] {
  return PROGRAMME_LANES.map((l): HistRole => {
    const days = new Array<number>(n).fill(0);
    for (const x of lines) if (x.lane === l.role) x.days.forEach((d, i) => { days[i]! += d; });
    return { lane: l.role, label: l.name, days, capacity: capacity(l.role) };
  }).filter((x) => sum(x.days) > 1e-9);
}

/** Over-allocation flags: every month a role's FTE exceeds its capacity (diagnostics only, D-B37). */
export function flagsOf(roles: readonly HistRole[], from: number, wdMonth: number): HistFlag[] {
  return roles.flatMap((r) => (r.capacity === null ? [] : r.days.flatMap((d, i) => {
    const fte = fteOf(d, wdMonth);
    return fte > r.capacity! + 1e-9 ? [{ lane: r.lane, label: r.label, month: from + i, fte, capacity: r.capacity! }] : [];
  })));
}

/** Σ person-days × rate of the lines in the euro result: the programme's labour cost (= the cost model's labour rows). */
export const histogramLabourCost = (h: Pick<ProgrammeHistogram, 'lines'>, inCost = true): number =>
  h.lines.filter((l) => l.inCost === inCost).reduce((s, l) => s + sum(l.days) * l.rate, 0);

/** A series of the histogram: a role (its lane) or a group of roles (FX-16: by team, unit or location). */
export interface HistSeries { key: string; label: string; days: number[] }
/** The roles regrouped (`group`: the group of a lane): days added up per group, in the order the groups first appear. */
export function regroup(roles: readonly HistRole[], group: (lane: string) => { key: string; label: string }): HistSeries[] {
  const out = new Map<string, HistSeries>();
  for (const r of roles) {
    const g = group(r.lane), cur = out.get(g.key) ?? { key: g.key, label: g.label, days: r.days.map(() => 0) };
    r.days.forEach((d, i) => { cur.days[i] = (cur.days[i] ?? 0) + d; });
    out.set(g.key, cur);
  }
  return [...out.values()];
}
