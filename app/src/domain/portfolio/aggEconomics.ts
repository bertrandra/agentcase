/** @calc-zone aggregate-views */
import { calendarOf } from './calendar';
import type { Consolidated } from './consolidate';
import type { ChartView } from './consolidationView';
import { selectionOf, total, yearEnds, lastOf } from './aggEconomicsSel';
import type { DisplayScope, PortfolioHeadline } from './portfolioHeadline';
import { cumulativeOf as cumulative } from '../economics/cashflow';
import { byYear, type Series } from './series';
import { selectionView } from './selectionView';
import type { Portfolio } from './types';

type Excluded = { id: string; name: string; archived: boolean }[];
const waveName = (pf: Portfolio, id: string): string => pf.waves.find((w) => w.id === id)?.name ?? '';
const excludedOf = (pf: Portfolio, c: Consolidated, scope: DisplayScope): Excluded => selectionView(pf, c, scope)?.excluded ?? [];

/**
 * The run cost of a range of months split in its parts: the team and the agentic run team are what is left once tokens, infrastructure and the
 * Knowledge Hub are taken out.
 */
export interface RunParts { run: number; team: number; token: number; infra: number; kh: number }
const partsOf = (s: Series, from = 0, to = s.run.length): RunParts => {
  const f = (a: number[]) => total(a.slice(from, to)), run = f(s.run), token = f(s.token), infra = f(s.infra), kh = f(s.khCost);
  return { run, team: run - token - infra - kh, token, infra, kh };
};
export interface RunYearRow extends RunParts { label: string; etp: number }
export interface RunProductRow extends RunParts { id: string; name: string; wave: string; etp: number }
export interface RunAgg { label: string; headline: PortfolioHeadline; years: RunYearRow[]; rows: RunProductRow[]; totals: RunParts & { etp: number };
  excluded: Excluded }

/** Agentic Run of a Portfolio / Wave: recurring costs by calendar year (the 12-month blocks of the summed series) and by product. */
export function aggregateRun(pf: Portfolio, c: Consolidated, scope: DisplayScope): RunAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const ends = yearEnds(sel.series.humanFte);
  return {
    label: sel.label, headline: sel.headline, excluded: excludedOf(pf, c, scope),
    years: ends.map((etp, i) => ({ label: `Year ${i + 1}`, etp, ...partsOf(sel.series, i * 12, (i + 1) * 12) })),
    rows: sel.items.map((v) => ({ id: v.id, name: v.name, wave: waveName(pf, v.waveId), etp: lastOf(v.series.humanFte), ...partsOf(v.series) })),
    totals: { ...partsOf(sel.series), etp: lastOf(sel.series.humanFte) },
  };
}

export interface AnnualYearRow { label: string; savings: number; run: number; setup: number; net: number; cum: number; etp: number; vfte: number }
export interface AnnualProductRow { id: string; name: string; wave: string; net: number[] }
export interface AnnualAgg { label: string; headline: PortfolioHeadline; years: AnnualYearRow[]; rows: AnnualProductRow[]; totalNet: number[];
  totals: { savings: number; run: number; setup: number; net: number }; excluded: Excluded }

/** Annual summary of a Portfolio / Wave: one line per calendar year (12-month blocks), the net by product and year, year-end headcount. */
export function aggregateAnnual(pf: Portfolio, c: Consolidated, scope: DisplayScope): AnnualAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const s = sel.series, h = sel.headline, cum = yearEnds(cumulative(s.net)), etp = yearEnds(s.humanFte), vfte = yearEnds(s.agentVfte);
  return {
    label: sel.label, headline: h, excluded: excludedOf(pf, c, scope),
    years: h.years.savings.map((sv, i) => ({ label: `Year ${i + 1}`, savings: sv, run: h.years.run[i] ?? 0, setup: h.years.setup[i] ?? 0,
      net: h.years.net[i] ?? 0, cum: cum[i] ?? 0, etp: etp[i] ?? 0, vfte: vfte[i] ?? 0 })),
    rows: sel.items.map((v) => ({ id: v.id, name: v.name, wave: waveName(pf, v.waveId), net: byYear(v.series.net) })),
    totalNet: byYear(s.net), totals: { savings: h.totalBenefit, run: total(s.run), setup: h.setup, net: h.net },
  };
}

export interface MonthlyRow { month: number; label: string; savings: number; run: number; setup: number; net: number; cum: number; etp: number; vfte: number }
export interface MonthlyAgg { label: string; headline: PortfolioHeadline; months: MonthlyRow[]; chart: ChartView; excluded: Excluded }

/**
 * Monthly detail of a Portfolio / Wave on the calendar axis: one line per month of the horizon, and the cumulative cash of the selection and of each
 * product.
 */
export function aggregateMonthly(pf: Portfolio, c: Consolidated, scope: DisplayScope): MonthlyAgg | null {
  const sel = selectionOf(c, scope), view = selectionView(pf, c, scope);
  if (!sel || !view) return null;
  const s = sel.series, cum = sel.summary.cum, cal = calendarOf(pf);
  return {
    label: sel.label, headline: sel.headline, excluded: view.excluded, chart: view.chart,
    months: s.net.map((net, i) => ({ month: i + 1, label: cal.dateAt(i), savings: s.savings[i] ?? 0, run: s.run[i] ?? 0, setup: s.setup[i] ?? 0, net,
      cum: cum[i] ?? 0, etp: s.humanFte[i] ?? 0, vfte: s.agentVfte[i] ?? 0 })),
  };
}
