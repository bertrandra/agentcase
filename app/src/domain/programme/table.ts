/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { activityEnabled, descriptionKey, linkedSection, type ActivityEnabled } from './activityMeta';
import type { CostRule, ParamDef, ProgrammePhase } from './catalogueTypes';
import { activityType, type ActivityType } from './costProfile';
import { laneDef } from './lanes';
import type { ProgrammeView } from './model';
import { pilotTiming } from './timing';
import { coachingPlan, engineProfile, horizonMonthsOf, lineOnMonths, pilotLine, programmeLines, programmeRates, type ProgrammeLine } from './profile';

/**
 * The 📋 Programme screen's table (docs/SPEC_BPMN.md § 19.11 F-B79; phase B9e): every activity and milestone of the programme process
 * (`model.ts`) with Enabled, description, type, timing, cost with its rule and resource details, cost by year and the linked section. Read from
 * the owners only: the programme view (description, placement, cost), the cost profile (`profile.ts`: each line's months, the totals the engine
 * reads), `activityMeta.ts` and `costProfile.ts`. A cost line shared by several activities (the engagement stages) is carried by its first one.
 */
export interface CostDetail {
  /** labour days of the activity, days a month over its duration, the duration in months, the day rate, the role that does it */
  days: number | null; perMonth: number | null; months: number | null; rate: number | null; role: string;
}
export interface ProgrammeRow {
  id: string; kind: string; name: string; phase: ProgrammePhase; element: 'task' | 'gateway' | 'milestone'; level: 'case' | 'product';
  instances: number | null; description: string;
  /** the key of its own description (null: a milestone, its criteria belong to their owner) */
  descKey: string | null;
  enabled: ActivityEnabled; type: ActivityType; placement: string;
  /** its parameters of timing (durations) and of cost (the rest), as the Process panel edits them */
  timingParams: ParamDef[]; costParams: ParamDef[];
  costRule: CostRule; ruleText: string; amount: number | null; per: 'once' | 'year 1' | null; note: string; detail: CostDetail | null;
  /** its cost by horizon year in the euro result (null: not a programme line, or carried by `sharedWith`) */
  years: number[] | null;
  /** the activity that carries the shared cost line */
  sharedWith: string | null;
  /** the context section that uses it */
  linked: string | null;
}
export interface ProgrammeTable {
  rows: ProgrammeRow[];
  /** the programme cost of the euro result by horizon year and in total (the engine's profile) */
  years: number[]; total: number;
  /** the pilot, outside the euro result (DEV-COSTMODEL-PILOT) */
  pilot: number;
}

const TIMING_UNITS: readonly string[] = ['weeks', 'months', 'sprints'];
const isTiming = (p: ParamDef): boolean => TIMING_UNITS.includes(p.unit) || p.key === 'khSetupDays';
/** Monthly amounts (index t − 1) added up by horizon year. */
export const byYear = (months: number[], H: number): number[] =>
  Array.from({ length: Math.max(1, Math.ceil(H / 12)) }, (_, y) => months.slice(12 * y, 12 * y + 12).reduce((a, x) => a + x, 0));

function detailOf(c: Ctx, kind: string, role: string, line: ProgrammeLine | undefined): CostDetail | null {
  const rate = programmeRates(c);
  if (kind === 'pilot') return { days: pilotLine(c).days, perMonth: null, months: pilotTiming(c).months, rate: rate.tjm || 600, role };
  if (!line || line.effortDays === null) return null;
  const plan = kind === 'setupCoaching' ? coachingPlan(c) : null;   // its days a month as entered (the spread stops at the horizon)
  const m = plan ? plan.months : line.duration ?? null, perMonth = plan ? plan.perMonth : m && m > 0 ? line.effortDays / m : null;
  return { days: line.effortDays, perMonth, months: m, rate: line.id === 'knowledge' ? rate.tjm : rate.role, role };
}

/** The table of the programme `v` of case `c`. */
export function programmeTable(c: Ctx, v: ProgrammeView): ProgrammeTable {
  const H = horizonMonthsOf(c), lines = programmeLines(c, H), carried = new Map<string, string>();
  const rows: ProgrammeRow[] = v.activities.map((a) => {
    const type = activityType(c, a.kind), line = type.line ? lines.find((l) => l.id === type.line) : undefined;
    const owner = type.line ? carried.get(type.line) ?? null : null;
    if (type.line && !owner) carried.set(type.line, a.name);
    const params = a.params.filter((p) => !(activityEnabled(c, a).key === p.key));
    return {
      id: a.id, kind: a.kind, name: a.name, phase: a.phase, element: 'task', level: a.level, instances: a.instances, description: a.description,
      descKey: descriptionKey(a.kind), enabled: activityEnabled(c, a), type, placement: a.placement.text, timingParams: params.filter(isTiming),
      costParams: params.filter((p) => !isTiming(p)), costRule: a.costRule, ruleText: a.cost.rule, amount: a.cost.amount, per: a.cost.per,
      note: a.cost.note, detail: detailOf(c, a.kind, laneDef(a.lane).name, line), years: line && !owner ? byYear(lineOnMonths(line, H), H) : null,
      sharedWith: owner, linked: linkedSection(a.kind),
    };
  });
  for (const m of v.milestones) {
    rows.push({ id: m.id, kind: m.kind, name: m.name, phase: m.phase, element: m.element, level: 'product', instances: m.instances, description: m.criteria,
      descKey: null, enabled: { on: true, locked: true, key: null, note: 'A milestone: no cost' }, type: activityType(c, m.kind), placement: m.placement,
      timingParams: [], costParams: [], costRule: 'none', ruleText: 'No cost', amount: null, per: null, note: '', detail: null, years: null, sharedWith: null,
      linked: linkedSection(m.kind) });
  }
  const years = byYear(engineProfile(c, H).setup, H);
  return { rows, years, total: years.reduce((a, x) => a + x, 0), pilot: pilotLine(c).cost };
}
