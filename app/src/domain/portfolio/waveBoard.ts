/** @calc-zone portfolio-consolidation */
import { teamEtp } from './alloc';
import { calendarOf } from './calendar';
import type { Consolidated } from './consolidate';
import { summaryRow, type SummaryRow } from './consolidationView';
import { effectiveTeam } from './sharedTeam';
import { productMonth0, waveSchedule } from './timeline';
import type { Portfolio, WaveDependency } from './types';
import { dependencyTargets } from './waveDepOps';
import { dependencyLabel } from './waveSchedule';

/** A product card of the wave board. */
export interface BoardCard {
  id: string;
  name: string;
  archived: boolean;
  offset: number;
  /** entry headcount (ETP) */
  etp: number;
  /** calendar month label of its month 0 (effective wave start + offset, after the capacity); null when it is not planned */
  startLabel: string | null;
  /** months the transformation-team capacity pushed its setup back (0 = none) */
  pushed: number;
}

/** A column of the board: a wave (id set), or the "Unscheduled" column (id null). */
export interface BoardColumn {
  id: string | null;
  name: string;
  /** the wave's own start month (the input) */
  startMonth: number;
  /** calendar label of the wave start ("Mar 27"), from the portfolio start date */
  startLabel: string | null;
  /** effective start month (after its dependency) and its label; equal to the own start without a dependency */
  effectiveStart: number;
  effectiveLabel: string | null;
  /** the dependency (input) and in words ("after Wave 1 starts + 2 months"); null when none */
  dependsOn: WaveDependency | null;
  after: string | null;
  /** waves it may depend on (choosing one never closes a cycle) */
  targets: { id: string; name: string }[];
  note: string;
  cards: BoardCard[];
  /** the wave's consolidated figures (the existing wave aggregate); null for the unplanned column */
  totals: SummaryRow | null;
}

/** The wave board (F10-F12): columns = waves in order, then the unplanned products; totals come from the wave aggregates of the consolidation. */
export function waveBoard(pf: Portfolio, c: Consolidated): BoardColumn[] {
  const cal = calendarOf(pf), byId = new Map(pf.products.map((p) => [p.id, p])), plan = waveSchedule(pf);
  const card = (id: string, month0: number | null): BoardCard => {
    const p = byId.get(id)!;
    return { id, name: p.name, archived: !!p.archived, offset: p.offsetMonths, etp: teamEtp(effectiveTeam(pf, p)),
      startLabel: month0 === null ? null : cal.dateAt(month0), pushed: plan.pushed.get(id) ?? 0 };
  };
  const cols = pf.waves.map((w): BoardColumn => {
    const view = c.waves.find((x) => x.id === w.id)!, eff = plan.starts.get(w.id) ?? w.startMonth;
    return {
      id: w.id, name: w.name, startMonth: w.startMonth, startLabel: cal.dateAt(w.startMonth), note: w.note ?? '',
      effectiveStart: eff, effectiveLabel: cal.dateAt(eff), dependsOn: w.dependsOn ?? null, after: dependencyLabel(pf, w),
      targets: dependencyTargets(pf, w.id).map((x) => ({ id: x.id, name: x.name })),
      cards: w.productIds.filter((id) => byId.has(id)).map((id) => card(id, plan.month0.get(id) ?? productMonth0(w, byId.get(id)!))),
      totals: summaryRow(w.id, w.name, view.productIds.length, view.series, view.summary),
    };
  });
  const out: BoardColumn[] = [{ id: null, name: 'Unscheduled', startMonth: 0, startLabel: null, note: '', effectiveStart: 0, effectiveLabel: null, dependsOn: null,
    after: null, targets: [],
    cards: pf.products.filter((p) => p.waveId === null).map((p) => card(p.id, null)), totals: null }];
  return [...cols, ...out];
}
