import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
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
import { appStore } from '@/store/instance';
import { reportData } from '@/store/persistence/report/data';
import { resultsData } from '@/store/persistence/excel/results';
import { dumpBuffer, loadCase as loadIntoStore } from '../helpers/xlsxDump';

/**
 * One source of truth, guarded (lot 10): every business figure is computed once in `src/domain` and every surface that shows it (screens' views,
 * aggregate inputs, the registry variables, the calculation package, the report and the Excel results workbook) prints that value. A surface that
 * recomputes a figure on its own breaks one of these equalities on some fixture.
 * Owners: setup (`setupBreakdown`, read by the model's drivers), FTE before / after / freed (`fteBeforeAfter`), net / ROI / payback / total benefit
 * (`headline`), savings and run cost per year (the Time Engine year rows).
 */
const ALL = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const load = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const variable = (id: string, c: ReturnType<typeof makeCtx>) => VARIABLES.find((v) => v.id === id)!.get(c);
const close = (a: number, b: number, what: string, tol = 1e-9) => expect(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${what}: ${a} vs ${b}`).toBe(true);

describe('one source of truth: the same figure on every surface (all fixtures)', () => {
  it('has the 107 oracle cases', () => expect(ALL.length).toBe(107));

  it.each(ALL)('%s: the setup breakdown lines add up to model().setupTotal, which every setup surface prints', (id) => {
    const state = load(id), c = makeCtx(state), m = model(c), b = setupBreakdown(c), h = headline(c);
    expect(b.total).toBe(m.setupTotal);
    close(b.lines.reduce((a, l) => a + l.amount, 0), m.setupTotal, 'Σ lines = setupTotal');
    close(investmentLines(b).reduce((a, [, x]) => a + x, 0), m.setupTotal, 'Σ investment lines (Financial, Excel)');
    expect([h.setup, economicsView(c).setup, resultsCore(c).setup, variable('setupTotal', c), reportData(state, new Date(0)).setup])
      .toEqual(Array(5).fill(m.setupTotal));
    close(resultsData(c).setupLines.reduce((a, [, x]) => a + x, 0), m.setupTotal, 'Excel Investment sheet lines');
  });

  it.each(ALL)('%s: FTE before / after / freed / reduction come from fteBeforeAfter on every surface', (id) => {
    const state = load(id), c = makeCtx(state), f = caseFte(c), end = engineNow(c).years().at(-1)!, v = economicsView(c);
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
  });

  it.each(ALL)('%s: net, ROI, payback, total benefit and the end-year savings are the owner values on every surface', (id) => {
    const state = load(id), c = makeCtx(state), h = headline(c), ys = engineNow(c).years(), end = ys.at(-1)!, v = economicsView(c), r = resultsCore(c);
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
  });
});

describe('one source of truth: the Excel results workbook prints the owners (four fixtures)', () => {
  it.each(['golden', 'ctx-msi', 'horizon-5', 'hri-on'])('%s', async (id) => {
    loadIntoStore(id);
    const c = makeCtx(appStore().getState().doc), h = headline(c), f = fteByYear(c);
    const sheets = await dumpBuffer(await (await exportResultsWorkbook()).blob.arrayBuffer());
    const sheet = (n: string) => sheets.find((s) => s.name === n)!.rows, row = (n: string, label: string) => sheet(n).find((r) => r[0] === label)!;
    expect(row('Savings', 'Human FTE freed').slice(1)).toEqual(f.map((x) => +x.freed.toFixed(1)));
    expect(row('Investment', 'Total one-time investment')[1]).toBe(Math.round(h.setup));
    const inv = sheet('Investment').slice(1, -1).reduce((a, r) => a + (r[1] as number), 0);
    expect(Math.abs(inv - h.setup)).toBeLessThanOrEqual(sheet('Investment').length);   // the lines are rounded one by one
    expect(row('ROI', 'Setup investment')[1]).toBe(Math.round(h.setup));
    expect(String(sheet('ROI').find((r) => String(r[0]).startsWith('Net profit'))![1])).toBe(String(Math.round(h.net)));
    expect(sheet('P&L').find((r) => String(r[0]).startsWith('Net'))!.at(-1)).toBe(Math.round(h.net));
  });
});
