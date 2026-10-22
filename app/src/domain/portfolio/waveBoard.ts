import { teamEtp } from './alloc';
import { calendarOf } from './calendar';
import type { Consolidated } from './consolidate';
import { summaryRow, type SummaryRow } from './consolidationView';
import { productMonth0 } from './timeline';
import type { Portfolio } from './types';

/** A product card of the wave board. */
export interface BoardCard {
  id: string;
  name: string;
  archived: boolean;
  offset: number;
  /** entry headcount (ETP) */
  etp: number;
  /** calendar month label of its month 0 (wave start + offset); null when it is not planned */
  startLabel: string | null;
}

/** A column of the board: a wave (id set), or the "Unscheduled" column (id null). */
export interface BoardColumn {
  id: string | null;
  name: string;
  startMonth: number;
  /** calendar label of the wave start ("Mar 27"), from the portfolio start date */
  startLabel: string | null;
  note: string;
  cards: BoardCard[];
  /** the wave's consolidated figures (the existing wave aggregate); null for the unplanned column */
  totals: SummaryRow | null;
}

/** The wave board (F10-F12): columns = waves in order, then the unplanned products; totals come from the wave aggregates of the consolidation. */
export function waveBoard(pf: Portfolio, c: Consolidated): BoardColumn[] {
  const cal = calendarOf(pf), byId = new Map(pf.products.map((p) => [p.id, p]));
  const card = (id: string, month0: number | null): BoardCard => {
    const p = byId.get(id)!;
    return { id, name: p.name, archived: !!p.archived, offset: p.offsetMonths, etp: teamEtp(p.teamIn), startLabel: month0 === null ? null : cal.dateAt(month0) };
  };
  const cols = pf.waves.map((w): BoardColumn => {
    const view = c.waves.find((x) => x.id === w.id)!;
    return {
      id: w.id, name: w.name, startMonth: w.startMonth, startLabel: cal.dateAt(w.startMonth), note: w.note ?? '',
      cards: w.productIds.filter((id) => byId.has(id)).map((id) => card(id, productMonth0(w, byId.get(id)!))),
      totals: summaryRow(w.id, w.name, view.productIds.length, view.series, view.summary),
    };
  });
  const out: BoardColumn[] = [{ id: null, name: 'Unscheduled', startMonth: 0, startLabel: null, note: '', cards: pf.products.filter((p) => p.waveId === null).map((p) => card(p.id, null)), totals: null }];
  return [...cols, ...out];
}
