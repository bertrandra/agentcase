/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { caseHorizonYears } from '../inputs';
import type { ColourRole } from '../theme';
import { PROGRAMME_ACTIVITIES } from './catalogue';
import { criticalIds, type Link } from './critical';
import { activityBar, type Bar } from './ganttSpans';
import { programmeActivityId } from './ids';
import type { LaneRole } from './lanes';
import { programmeMilestones } from './milestones';
import { hubSetupTiming, programmeCalendar, type ProgrammeCalendar } from './timing';

export type { Link } from './critical';
/**
 * The ONE Gantt of the transformation programme (docs/SPEC_BPMN.md § 19.8 F-B73; phase B9d), built from the programme process: a bar per
 * activity of the catalogue placed by the timing owner (`ganttSpans.ts` → `timing.ts`, F-B65), finish-to-start links with their lag from the
 * sequence flows (the engagement stages in order) and the message flows (pilot decision → scale, hub ready → agents enabled), milestones from
 * the decision gate and the engine's crossings (maturity gates, governance gates), and the critical path. The Gantt section's programme band
 * (`verifyB/ganttProgram.ts` `programRows`), the WBS dictionary, the MS Project export and the portfolio Gantt read it; nothing re-times a bar.
 */
export interface PlanBand { label: string; tone: ColourRole; meta: string; input?: string; value?: number; order: number }
export interface PlanTask extends Bar {
  /** bar id (the activity id, `@product` appended in a portfolio) and the activity id it opens in the Process section */
  id: string; activity: string; kind: string; name: string; lane: LaneRole; level: 'case' | 'product';
  preds: Link[]; critical: boolean;
  /** how the Gantt section's programme band prints the bar (the band rows only) */
  band?: PlanBand;
}
export interface GanttOpts { totalM: number; showStages: boolean; hub: boolean; lead?: number; milestones?: boolean }

/** Months on the Gantt's axis: the case horizon, at least a year. */
export const ganttMonths = (c: Ctx): number => Math.max(12, caseHorizonYears(c.inp) * 12);

const BAND: Record<string, Omit<PlanBand, 'meta' | 'value'>> = {
  build: { label: '🧱 Agentic Build (ramp)', tone: 'chart-cat-4', input: 'setupDuration', order: 10 },
  run: { label: '⚙️ Agentic Run (steady state)', tone: 'chart-cat-2', order: 11 },
  hubSetup: { label: '🧠 Knowledge Hub — Build / Setup', tone: 'chart-cat-2', input: 'khSetupDays', order: 12 },
  hubRun: { label: '🧠 Knowledge Hub — Run', tone: 'chart-cat-2', order: 13 },
};
function bandOf(c: Ctx, kind: string, b: Bar, cal: ProgrammeCalendar): PlanBand | undefined {
  const i = cal.stages.findIndex((s) => `stage-${s.stage.id}` === kind), s = cal.stages[i];
  if (s) return { label: s.stage.gantt, tone: s.stage.tone, meta: `${s.weeks} wk`, input: s.stage.input ?? undefined, value: s.weeks, order: i };
  const d = BAND[kind];
  if (!d) return undefined;
  if (kind === 'build') return { ...d, meta: `${b.dur} mo ramp to steady state`, value: b.dur };
  if (kind === 'hubSetup') { const days = hubSetupTiming(c).days; return { ...d, meta: `${days} days: ingest, index, guardrails`, value: days }; }
  return { ...d, meta: kind === 'run' ? 'ongoing delivery + support' : 'ongoing curation + retrieval' };
}

const AFTER: Record<string, string> = { run: 'build', agentops: 'build', hubRun: 'hubSetup' };
/** The links of a bar: the stages in sequence, the pilot with Pilot & Prove, and every bar of the product after the decision gate (with its lag). */
function linksOf(t: Pick<PlanTask, 'kind' | 'start' | 'level'>, cal: ProgrammeCalendar, has: (k: string) => boolean): Link[] {
  const O = cal.onboardEnd, id = (k: string) => programmeActivityId(k), stages = cal.stages.map((s) => `stage-${s.stage.id}`);
  const at = stages.indexOf(t.kind);
  if (at > 0) return [{ id: id(stages[at - 1]!), lag: 0 }];
  if (at === 0) return [];
  if (t.kind === 'stage-decide') return stages.length ? [{ id: id(stages.at(-1)!), lag: 0 }] : [];
  if (t.kind === 'pilot') return has('stage-validate') ? [{ id: id('stage-validate'), lag: 0 }] : [];
  const after = AFTER[t.kind];
  if (after && has(after)) return [{ id: id(after), lag: 0 }];
  return t.start >= O - 1e-9 && has('stage-decide') ? [{ id: id('stage-decide'), lag: t.start - O }] : [];
}

/** The programme Gantt of a case on its own calendar (months from the roadmap start). */
export function programmeGantt(c: Ctx, o: GanttOpts): PlanTask[] {
  const cal = programmeCalendar(c, o.totalM, { showStages: o.showStages, hub: o.hub }), span = { hub: o.hub, lead: o.lead ?? 0 };
  const bars: Omit<PlanTask, 'preds' | 'critical'>[] = [];
  for (const d of PROGRAMME_ACTIVITIES) {
    const b = activityBar(c, d, cal, span);
    if (!b) continue;
    const id = programmeActivityId(d.kind);
    bars.push({ ...b, id, activity: id, kind: d.kind, name: d.name, lane: d.lane, level: d.level, band: bandOf(c, d.kind, b, cal) });
  }
  if (o.milestones) {
    for (const m of programmeMilestones(c)) {
      if (m.month === null || cal.onboardEnd + m.month > o.totalM) continue;
      bars.push({ start: cal.onboardEnd + m.month, dur: 0, milestone: true, id: m.id, activity: m.id, kind: m.kind, name: m.name, lane: m.lane,
        level: 'product' });
    }
  }
  const kinds = new Set(bars.map((b) => b.kind)), has = (k: string) => kinds.has(k);
  const tasks = bars.map((b) => ({ ...b, preds: linksOf(b, cal, has), critical: false }));
  const hub = tasks.find((t) => t.kind === 'hubSetup'), run = tasks.find((t) => t.kind === 'run');
  if (hub && run && run.start >= hub.start + hub.dur) run.preds.push({ id: hub.id, lag: run.start - hub.start - hub.dur });   // hub ready → agents
  const crit = criticalIds(tasks);
  return tasks.map((t) => ({ ...t, critical: crit.has(t.id) }));
}

/**
 * A product's bar on the portfolio calendar (F-B73: the portfolio Gantt reads it, it places nothing itself): from its knowledge-transfer
 * preparation (`lead` months before its month 0) to the end of its setup (the timing owner's `setupMonths`) or of its adoption ramp (the engine's
 * last adoption / maturity crossing), whichever is later, cut at the horizon.
 */
export function productWindow(p: { month0: number; lead: number; setupMonths: number; rampEnd: number }, total: number): { from: number; to: number } {
  return { from: p.month0 - p.lead, to: Math.min(total, p.month0 + Math.max(p.setupMonths, p.rampEnd)) };
}
