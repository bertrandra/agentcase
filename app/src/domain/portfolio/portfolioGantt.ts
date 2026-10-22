/** @calc-zone portfolio-consolidation */
import { calendarOf, type Calendar } from './calendar';
import type { Consolidated } from './consolidate';
import type { ProductRun } from './run';
import type { Portfolio } from './types';
import type { ProductView } from './waves';

/** A product milestone placed on the portfolio calendar: its own Time Engine month + its month 0. */
export interface GanttMilestone { label: string; family: string; month: number; date: string; left: number; title: string }

export interface GanttProductRow {
  id: string;
  name: string;
  /** calendar months elapsed when the bar starts (KT preparation included) and ends (end of setup / adoption ramp, cut at the horizon) */
  from: number;
  to: number;
  month0: number;
  left: number;
  width: number;
  milestones: GanttMilestone[];
  meta: string;
}

export interface GanttWaveRow {
  id: string;
  name: string;
  startMonth: number;
  from: number;
  to: number;
  left: number;
  width: number;
  products: GanttProductRow[];
  meta: string;
}

export interface PortfolioGantt {
  totalM: number;
  ticks: { left: number; label: string }[];
  /** only waves with planned products */
  waves: GanttWaveRow[];
  /** names of the products left out (no wave) */
  unplanned: string[];
}

const ramps = new WeakMap<ProductRun, { end: number; marks: { label: string; family: string; month: number }[] }>();
/** The product's own milestones (adoption levels, payback, first agent vFTE) and the month its ramp ends: the later of the setup profile and its last adoption / maturity milestone. */
function ownMarks(run: ProductRun) {
  let r = ramps.get(run);
  if (!r) {
    let marks: { label: string; family: string; month: number }[] = [];
    try { marks = run.engine.milestones().filter((m) => m.month >= 1); } catch { marks = []; }
    const rampEnd = marks.filter((m) => m.family !== 'financial' && m.family !== 'workforce').reduce((a, m) => Math.max(a, m.month), 0);
    r = { end: Math.max(run.profile, rampEnd), marks };
    ramps.set(run, r);
  }
  return r;
}

function productRow(v: ProductView, total: number, cal: Calendar): GanttProductRow {
  const { end, marks } = ownMarks(v.run), from = v.month0 - v.lead, to = Math.min(total, v.month0 + end);
  const milestones = marks.map((m) => ({ ...m, month: v.month0 + m.month })).filter((m) => m.month <= total)
    .map((m) => ({ ...m, date: cal.dateAt(m.month), left: (m.month / total) * 100, title: `${v.name}: ${m.label} — ${cal.dateAt(m.month)} (calendar month ${m.month})` }));
  return {
    id: v.id, name: v.name, from, to, month0: v.month0, left: (from / total) * 100, width: Math.max(0.4, ((to - from) / total) * 100), milestones,
    meta: `starts ${cal.dateAt(v.month0)} (month ${v.month0 + 1}), ramps up to ${cal.dateAt(to)}`,
  };
}

const memo = new WeakMap<Consolidated, PortfolioGantt>();
/**
 * The wave Gantt (F18): per wave one aggregated bar from the earliest start of its products to the latest end of their setup / ramp, expandable to the
 * products with their own milestones, all read from the consolidation's product runs and laid on the calendar (month 0 = wave start + offset).
 */
export function portfolioGantt(pf: Portfolio, c: Consolidated): PortfolioGantt {
  const hit = memo.get(c);
  if (hit) return hit;
  const total = Math.max(12, c.horizon), cal = calendarOf(pf), byId = new Map(pf.products.map((p) => [p.id, p.name]));
  const waves = c.waves.filter((w) => w.productIds.length > 0).map((w): GanttWaveRow => {
    const products = c.products.filter((v) => v.waveId === w.id).map((v) => productRow(v, total, cal));
    const from = Math.min(...products.map((p) => p.from)), to = Math.max(...products.map((p) => p.to));
    return { id: w.id, name: w.name, startMonth: w.startMonth, from, to, left: (from / total) * 100, width: Math.max(0.4, ((to - from) / total) * 100), products,
      meta: `${products.length} product${products.length > 1 ? "s" : ""}, from ${cal.dateAt(from)} to ${cal.dateAt(to)}` };
  });
  const out = {
    totalM: total, ticks: Array.from({ length: Math.floor(total / 12) + 1 }, (_, k) => ({ left: ((k * 12) / total) * 100, label: cal.dateAt(k * 12) })),
    waves, unplanned: c.excluded.map((id) => byId.get(id) ?? id),
  };
  memo.set(c, out);
  return out;
}
