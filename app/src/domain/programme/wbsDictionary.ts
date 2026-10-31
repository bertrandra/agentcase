/** @calc-zone delivery-views */
import { activityDef } from './catalogue';
import { activityCost } from './costs';
import { deliverableOf } from './deliverables';
import { laneDef, type LaneRole } from './lanes';
import { programmeMilestones } from './milestones';
import { isoDay, planDate, type Plan } from './plan';
import { MILESTONE_ACCOUNTABLE } from './ram';
import { wbsCodes, type WbsNode } from './wbs';

/**
 * The WBS dictionary (docs/SPEC_BPMN.md § 19.8 F-B74; phase B9d): per work package its name, description (the programme's, never a copy kept
 * elsewhere), named deliverable (D-B35), Accountable (its RACI), roles (Responsible and Consulted lanes), effort and cost (read from the
 * activity's cost owner, § 19.3), duration, start, finish and predecessors (WBS codes, with their lag). Milestones have no effort, cost or
 * duration.
 */
export interface DictionaryRow {
  code: string; name: string; activity: string; description: string; deliverable: string; accountable: string; roles: string;
  effortDays: number | null; cost: number | null; costPer: string; costRule: string;
  months: number; start: string; finish: string; predecessors: string; milestone: boolean; critical: boolean;
}
const lane = (r: LaneRole | undefined): string => (r ? laneDef(r).name : '—');
const r1 = (n: number): number => Math.round(n * 10) / 10;

export function wbsDictionary(p: Plan, w: readonly WbsNode[]): DictionaryRow[] {
  const codes = wbsCodes(w), ctxOf = new Map(p.products.map((x) => [x.id, x.ctx])), crit = new Map(programmeMilestones(p.c).map((m) => [m.kind, m]));
  return w.filter((n) => n.task).map((n): DictionaryRow => {
    const t = n.task!, d = activityDef(t.kind), ms = crit.get(t.kind), c = (t.productId && ctxOf.get(t.productId)) || p.c;
    const cost = d ? activityCost(c, d) : null;
    const preds = t.preds.map((x) => `${codes.get(x.id) ?? x.id}${x.lag > 1e-9 ? ` FS+${r1(x.lag)} mo` : ''}`).join(', ');
    return {
      code: n.code, name: t.name, activity: t.activity, description: d?.description ?? ms?.criteria ?? '', deliverable: deliverableOf(t.kind),
      accountable: lane(d ? d.raci.A : MILESTONE_ACCOUNTABLE), roles: d ? [d.lane, ...d.raci.C].map((r) => lane(r)).join(', ') : lane(t.lane),
      effortDays: cost?.effortDays ?? null, cost: cost?.amount ?? null, costPer: cost?.per ?? '', costRule: cost?.rule ?? 'No cost of its own',
      months: r1(t.dur), start: isoDay(planDate(p.startDate, t.start)), finish: isoDay(planDate(p.startDate, t.start + t.dur)), predecessors: preds,
      milestone: t.milestone, critical: t.critical,
    };
  });
}
