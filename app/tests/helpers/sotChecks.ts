import { expect } from 'vitest';
import { computeCase, engineNow, makeCtx, model, type CaseState } from '@/domain';
import { buildCalcPackage } from '@/domain/calcPackage';
import { economicsView } from '@/domain/economics';
import { caseFte, fteBeforeAfter, fteByYear } from '@/domain/economics/fte';
import { headline } from '@/domain/economics/headline';
import { storySummary } from '@/domain/pdc/story';
import { VARIABLES } from '@/domain/pdc/variables';
import { resultsCore } from '@/domain/verdict/results';
import { fteSummary, periodRows, targetTeam } from '@/domain/verifyA';
import { kpiView } from '@/domain/verifyB';
import { investmentLines, setupBreakdown } from '@/domain/tuneB/setup';
import { reportData } from '@/store/persistence/report/data';
import { resultsData } from '@/store/persistence/excel/results';

/**
 * The equalities of the one-source-of-truth guard (tests/domain/sot-cross-surface*.test.ts): every surface that shows a business figure prints the
 * owner's value. Run on the 107 oracle fixtures and on the B5 process cases (custom activities, roles, agents, rework boundary events).
 */
const variable = (id: string, c: ReturnType<typeof makeCtx>) => VARIABLES.find((v) => v.id === id)!.get(c);
const close = (a: number, b: number, what: string, tol = 1e-9) => expect(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${what}: ${a} vs ${b}`).toBe(true);

/** The setup breakdown lines add up to model().setupTotal, which every setup surface prints. */
export function setupSurfaces(state: CaseState): void {
  const c = makeCtx(state), m = model(c), b = setupBreakdown(c), h = headline(c);
  expect(b.total).toBe(m.setupTotal);
  close(b.lines.reduce((a, l) => a + l.amount, 0), m.setupTotal, 'Σ lines = setupTotal');
  close(investmentLines(b).reduce((a, [, x]) => a + x, 0), m.setupTotal, 'Σ investment lines (Financial, Excel)');
  expect([h.setup, economicsView(c).setup, resultsCore(c).setup, variable('setupTotal', c), reportData(state, new Date(0)).setup])
    .toEqual(Array(5).fill(m.setupTotal));
  close(resultsData(c).setupLines.reduce((a, [, x]) => a + x, 0), m.setupTotal, 'Excel Investment sheet lines');
}

/** FTE before / after / freed / reduction come from fteBeforeAfter on every surface. */
export function fteSurfaces(state: CaseState): void {
  const c = makeCtx(state), f = caseFte(c), end = engineNow(c).years().at(-1)!, v = economicsView(c);
  expect(f).toEqual(fteBeforeAfter(model(c).base.etp, end.totalHumanFteEnd));
  expect(computeCase(state).fte).toEqual(f);
  expect(v.fte).toEqual(f);
  expect(v.freed).toEqual(fteByYear(c).map((x) => x.freed));
  expect([v.freed.at(-1), variable('freedFteY3', c), variable('asisTobeFreedFte', c), fteSummary({ c, m: model(c), eng: engineNow(c) }).freed,
    periodRows({ c, m: model(c), eng: engineNow(c) }).at(-1)!.freed]).toEqual(Array(5).fill(f.freed));
  expect([variable('residualFteY3', c), variable('tobeTeamTotalHeadcount', c), resultsCore(c).team.human, storySummary(c).tgtFte,
    targetTeam({ c, m: model(c), eng: engineNow(c) }).totalRecurrent]).toEqual(Array(5).fill(f.after));
  expect(variable('headcountReductionPctKpi', c)).toBe(f.reductionPct);
  const k = kpiView(c);
  expect(k.cards[0]![1]).toBe(`${f.before.toFixed(1)} → ${f.after.toFixed(1)}`);
  expect(k.eco[2]![2]).toBe(`${f.freed.toFixed(1)} FTE`);
  expect(k.chart[0]).toBe(f.before > 0 ? Math.round((f.after / f.before) * 100) : 0);
}

/** Net, ROI, payback, total benefit and the end-year savings are the owner values on every surface. */
export function moneySurfaces(state: CaseState): void {
  const c = makeCtx(state), h = headline(c), ys = engineNow(c).years(), end = ys.at(-1)!, v = economicsView(c), r = resultsCore(c);
  expect([v.net, r.net, variable('netProfit3y', c), computeCase(state).headline.totalSavings, buildCalcPackage(state).headline.totalSavings])
    .toEqual(Array(5).fill(h.net));
  expect([v.roi, r.roi, computeCase(state).headline.roi]).toEqual(Array(3).fill(h.roi));
  expect([v.payback, variable('paybackMonths', c), computeCase(state).payback]).toEqual(Array(3).fill(h.paybackMonth));
  expect(v.totalBenefit).toBe(h.totalBenefit);
  close(v.yearNet.reduce((a, x) => a + x, 0), h.net, 'Σ yearly net after setup = net', 1e-9);
  expect([v.series.savings.at(-1), r.last.model, storySummary(c).endSavings, variable('netSavY3', c), computeCase(state).endYear.savings,
    reportData(state, new Date(0)).endSaving]).toEqual(Array(6).fill(end.savings));
  close(r.last.total + r.last.other, end.savings, 'Results decomposition + reconciling line = end-year savings', 1e-9);
  expect(variable('netSavY1', c)).toBe(ys[0]!.savings);
  expect(variable('runCostY1', c)).toBe(ys[0]!.totalRunCost);
  expect(variable('netSavY2', c)).toBe(ys[1]?.savings ?? null);
  expect(variable('runCostY2', c)).toBe(ys[1]?.totalRunCost ?? null);
}
