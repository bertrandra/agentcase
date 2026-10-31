/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { khEnabled } from '../knowledge';
import type { Consolidated } from '../portfolio/consolidate';
import { criticalIds } from './critical';
import { ganttMonths, programmeGantt, type PlanTask } from './gantt';
import { programmeCalendar } from './timing';

/**
 * The programme plan of a display scope (docs/SPEC_BPMN.md § 19.8; phase B9d): the bars of the ONE programme Gantt (`programmeGantt`) for the
 * Product scope (a single case, or the active product), or, for the Wave and Portfolio scopes, the case-level bars (the engagement stages,
 * programme assurance) once and each planned product's bars shifted to its month 0 on the portfolio calendar (the consolidation's `month0` and
 * knowledge-transfer `lead`, which read the timing owner). Month 0 of the plan is the roadmap start (`rmStart`); the first wave's month 0 is where
 * the onboarding stages end. The critical path is computed on the whole plan. A view: nothing is stored or re-timed.
 */
export interface PlanProduct { id: string; name: string; wave: { id: string; name: string } | null; ctx: Ctx }
export interface PlanBar extends PlanTask { productId: string | null }
export interface Plan {
  tasks: PlanBar[]; products: PlanProduct[]; totalM: number;
  /** the roadmap start (YYYY-MM-DD) and the ctx that holds the case-level values */
  startDate: string; c: Ctx;
}
const START = '2026-09-01';

/** The plan of a single case (or of the active product, Product scope). */
export function casePlan(c: Ctx, name: string, productId = 'case'): Plan {
  const totalM = ganttMonths(c), tasks = programmeGantt(c, { totalM, showStages: true, hub: khEnabled(c), milestones: true });
  return { tasks: tasks.map((t) => ({ ...t, productId: t.level === 'product' ? productId : null })), products: [{ id: productId, name, wave: null, ctx: c }],
    totalM, startDate: c.inp.v('rmStart') || START, c };
}

/**
 * The plan of the Portfolio (or of a selection — one wave or one unit, `only`: its planned products, `scopeGroup.ts`) from its consolidation; `c`:
 * the case-level values (the common case).
 */
export function portfolioPlan(c: Ctx, k: Consolidated, only?: readonly string[]): Plan {
  const views = k.products.filter((v) => !only || only.includes(v.id)), O = programmeCalendar(c, 600, { showStages: true, hub: true }).onboardEnd;
  const waves = new Map(k.waves.map((w) => [w.id, w.name])), totalM = Math.max(12, k.horizon) + O;
  const caseBars = programmeGantt(c, { totalM, showStages: true, hub: khEnabled(c), milestones: false }).filter((t) => t.level === 'case');
  const caseIds = new Set(caseBars.map((t) => t.id));
  const bars: PlanBar[] = caseBars.map((t) => ({ ...t, productId: null }));
  for (const v of views) {
    const pc = v.run.ctx, Ov = programmeCalendar(pc, 600, { showStages: true, hub: true }).onboardEnd, shift = O + v.month0 - Ov;
    const own = programmeGantt(pc, { totalM: totalM - shift, showStages: true, hub: khEnabled(pc), lead: v.lead, milestones: true })
      .filter((t) => t.level === 'product');
    const at = (id: string) => `${id}@${v.id}`;
    for (const t of own) {
      bars.push({ ...t, id: at(t.id), start: t.start + shift, productId: v.id, critical: false,
        preds: t.preds.map((p) => (caseIds.has(p.id) ? { id: p.id, lag: p.lag + v.month0 } : { id: at(p.id), lag: p.lag })) });
    }
  }
  const crit = criticalIds(bars);
  return {
    tasks: bars.map((t) => ({ ...t, critical: crit.has(t.id) })), totalM, startDate: c.inp.v('rmStart') || START, c,
    products: views.map((v) => ({ id: v.id, name: v.name, wave: { id: v.waveId, name: waves.get(v.waveId) ?? v.waveId }, ctx: v.run.ctx })),
  };
}

/** Month `m` of the plan as a date (whole days: a month is 365.25 / 12 days), from the roadmap start. */
export function planDate(start: string, m: number): Date {
  const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(start), d = x ? Date.UTC(+x[1]!, +x[2]! - 1, +x[3]!) : Date.UTC(2026, 8, 1);
  return new Date(d + Math.round(m * (365.25 / 12)) * 86400000);
}
export const isoDay = (d: Date): string => d.toISOString().slice(0, 10);
