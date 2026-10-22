/** @calc-zone aggregate-views */
import { roiCanonical } from '../economics/roi';
import { resultsCore, type SavingsYear, type TeamShift } from '../verdict';
import { selectionOf, total } from './aggEconomicsSel';
import type { Consolidated } from './consolidate';
import type { DisplayScope, PortfolioHeadline } from './portfolioHeadline';
import { selectionView } from './selectionView';
import type { Portfolio } from './types';

export interface ResultsRow { id: string; name: string; wave: string; status: string; setup: number; net: number; roi: number | null; paybackMonth: number | null; eff: number }
export interface ResultsAgg {
  label: string;
  /** the consolidated money headline of the selection (net, setup, ROI, payback, NPV, weighted automation) */
  headline: PortfolioHeadline;
  rows: ResultsRow[];
  /** the selection as a line: what the rows add up to (ROI from the summed net and setup, automation weighted by entry headcount) */
  totals: Omit<ResultsRow, 'id' | 'name' | 'wave' | 'status'>;
  /** each product's last-year savings decomposition, added up */
  last: SavingsYear;
  /** each product's human -> agent shift at its horizon end, added up */
  team: TeamShift;
  excluded: { id: string; name: string; archived: boolean }[];
}

const sumBy = <T,>(xs: T[], f: (x: T) => number): number => total(xs.map(f));

/** Results of a Portfolio / Wave: consolidated key figures, savings decomposition and team shift (sums of the products' own `resultsCore`), one line per product. */
export function aggregateResults(pf: Portfolio, c: Consolidated, scope: DisplayScope): ResultsAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const h = sel.headline, cores = sel.items.map((v) => resultsCore(v.run.ctx)), lasts = cores.map((r) => r.last);
  const last: SavingsYear = { grossAuto: sumBy(lasts, (l) => l.grossAuto), agentCost: sumBy(lasts, (l) => l.agentCost), relocation: sumBy(lasts, (l) => l.relocation), netAuto: sumBy(lasts, (l) => l.netAuto), total: sumBy(lasts, (l) => l.total), model: sumBy(lasts, (l) => l.model) };
  return {
    label: sel.label, headline: h, last, excluded: selectionView(pf, c, scope)?.excluded ?? [],
    team: { asis: sumBy(cores, (r) => r.team.asis), human: sumBy(cores, (r) => r.team.human), agent: sumBy(cores, (r) => r.team.agent) },
    rows: sel.items.map((v, i) => ({ id: v.id, name: v.name, wave: pf.waves.find((w) => w.id === v.waveId)?.name ?? '', status: (cores[i] as ReturnType<typeof resultsCore>).status,
      setup: v.summary.setup, net: v.summary.net, roi: v.summary.roi, paybackMonth: v.summary.paybackMonth, eff: v.run.automation().eff })),
    totals: { setup: h.setup, net: h.net, roi: roiCanonical(h.net, h.setup), paybackMonth: h.paybackMonth, eff: h.eff },
  };
}
