/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { pfDecision, type PfStress, type Portfolio, type StressStats } from '@/domain/portfolio';
import { VERDICT_META } from '@/domain/verdict';
import { cardSheet, MONEY, table, type V } from './blocks';

/** What the workbook receives of the portfolio Monte Carlo: the last run and whether the portfolio moved since. */
export interface StressExtra { run: PfStress; stale: boolean }

const HEAD = ['P10', 'P50', 'P90', 'Mean', 'CVaR 10%', 'P(net < 0)'];
const FMT = [undefined, MONEY, MONEY, MONEY, MONEY, MONEY, '0.0%'];
const cells = (s: StressStats): V[] => [s.p10, s.p50, s.p90, s.mean, s.cvar10, s.pNetNeg];

/**
 * Sheet "Portfolio stress": the last portfolio Monte Carlo as the Stress portefeuille section shows it (`portfolioMonteCarlo`) and the verdicts the
 * Decision section derives from it (`pfDecision`): inputs of the run and staleness, the portfolio distribution, the risk reduction, then the
 * statistics by wave and by product and the verdict of the portfolio and of every wave. Nothing is computed here.
 */
export function stressSheet(wb: Workbook, name: string, pf: Portfolio, { run, stale }: StressExtra): void {
  const ws = wb.addWorksheet(name), s = run.stats, d = run.diversification;
  cardSheet(ws, [['Draws per product', run.draws], ['Seed', run.seed], ['Correlation rho', run.rho], ['Stale (portfolio changed since the run)', stale ? 'Yes' : 'No'],
    ['Portfolio P10', s.p10, MONEY], ['Portfolio P50', s.p50, MONEY], ['Portfolio P90', s.p90, MONEY], ['Portfolio mean', s.mean, MONEY], ['Portfolio CVaR 10%', s.cvar10, MONEY],
    ['P(net benefit < 0)', s.pNetNeg, '0.0%'], ['Sum of the products\' P10', d.sumP10, MONEY], ['Risk reduction (portfolio P10 - sum of product P10)', d.reduction, MONEY]]);
  table(ws, 'By wave', ['Wave', ...HEAD], [...run.waves.map((w) => [w.name, ...cells(w.stats)]), ['Portfolio', ...cells(s)]], FMT);
  table(ws, 'By product (own distribution)', ['Product', 'Wave', ...HEAD, 'Correlation with the portfolio'],
    run.products.map((p) => [p.name, pf.waves.find((w) => w.id === p.waveId)?.name ?? '', ...cells(p.stats), p.r]), [undefined, undefined, ...FMT.slice(1), '0.000']);
  const verdict = (label: string, g: Parameters<typeof pfDecision>[2]): V[] => {
    const v = pfDecision(pf, run, g);
    return v ? [label, VERDICT_META[v.verdict].short, v.confidence, v.p10Floor, v.stats.p10] : [label, 'n/a', '', '', ''];
  };
  table(ws, 'Verdict (Decision Intelligence rule on the distribution)', ['Scope', 'Verdict', 'Confidence % = P(net > 0)', 'P10 floor', 'P10'],
    [verdict('Portfolio', { kind: 'portfolio' }), ...run.waves.map((w) => verdict(w.name, { kind: 'wave', id: w.id }))], [undefined, undefined, undefined, MONEY, MONEY]);
  ws.getColumn(1).width = 46;
}
