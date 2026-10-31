import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { consolidate, portfolioGantt } from '@/domain/portfolio';
import { pilotLine, programmeLines, programmeCalendar, setupMonths } from '@/domain/programme';
import { ganttMonths, productWindow, programmeGantt } from '@/domain/programme/gantt';
import { histogramLabourCost, programmeHistogram } from '@/domain/programme/histogram';
import { deliveryHistogram } from '@/domain/programme/histogramDelivery';
import { casePlan, portfolioPlan } from '@/domain/programme/plan';
import { programmeWbs, WBS_KEY } from '@/domain/programme/wbs';
import { programRows } from '@/domain/verifyB/ganttProgram';
import { FIXTURE_IDS, identical, loadCase } from '../../helpers/portfolio';

/**
 * SPEC_BPMN § 19.8 (phase B9d): the programme Gantt, WBS and histogram are views of the programme process that read its one timing owner and
 * its one cost profile. Checked on the 107 fixtures: the Gantt band is the Gantt's rows, the WBS codes are unique and follow the tree, the histogram
 * gives back the cost profile's labour (Σ days × rate), the delivery view adds up to the engine's human FTE month by month.
 */
const sum = (a: readonly number[]): number => a.reduce((s, x) => s + x, 0);
const withValues = (s: CaseState, values: Record<string, string>): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...values } } });

describe.each(FIXTURE_IDS)('programme plan views: %s', (id) => {
  const s = loadCase(id), c = makeCtx(s);
  it('the Gantt band of the Gantt section is the programme Gantt\'s band rows (one owner, F-B73)', () => {
    const totalM = ganttMonths(c), rows = programRows(c, totalM).rows;
    const bars = programmeGantt(c, { totalM, showStages: true, hub: rows.some((r) => r.input === 'khSetupDays') }).filter((t) => t.band);
    if (!('ganttShowOnboarding' in (s.dom.checked ?? {})) || c.inp.c('ganttShowOnboarding')) {
      const band = bars.sort((a, b) => a.band!.order - b.band!.order).map((t) => [t.activity, t.start, t.dur]);
      expect(rows.map((r) => [r.activity, r.start, r.dur])).toEqual(band);
    }
    const g = programmeGantt(c, { totalM, showStages: true, hub: false }), build = g.find((t) => t.kind === 'build')!;
    expect([build.start, build.dur]).toEqual([programmeCalendar(c, totalM, { showStages: true, hub: false }).onboardEnd, setupMonths(c)]);
    const end = Math.max(...g.map((t) => t.start + t.dur));   // critical path: the stages, the gate and the bar that finishes last
    expect(g.filter((t) => t.kind.startsWith('stage-') || t.start + t.dur === end).every((t) => t.critical)).toBe(true);
  });
  it('the WBS: codes unique, a child\'s code extends its parent\'s, every bar of the plan a work package (F-B74)', () => {
    const p = casePlan(c, 'Product'), w = programmeWbs(p), codes = w.map((n) => n.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(w.filter((n) => n.task).length).toBe(p.tasks.length);
    w.forEach((n, i) => { if (i > 0) expect(n.code.split('.').length).toBe(n.level); });
  });
  it('the histogram gives back the labour of the cost profile: Σ days × rate per line = the line\'s amount (F-B76)', () => {
    const h = programmeHistogram(c), labour = programmeLines(c).filter((l) => l.rule === 'resources');
    expect(histogramLabourCost(h)).toBeCloseTo(sum(labour.map((l) => l.amount)), 4);
    expect(histogramLabourCost(h, false)).toBeCloseTo(pilotLine(c).cost, 4);
    for (const l of labour) expect(sum(h.lines.find((x) => x.id === l.id)!.days) * h.lines.find((x) => x.id === l.id)!.rate).toBeCloseTo(l.amount, 4);
  });
  it('the delivery view reads the engine: the roles add up to its human FTE every month, before = the entry team', () => {
    const d = deliveryHistogram(c), rows = engineNow(c).months();
    rows.forEach((r, i) => expect(sum(d.roles.map((x) => x.after[i]!))).toBeCloseTo(sum(d.roles.map((x) => x.before)) > 0 ? r.humanFte : 0, 6));
    expect(d.runTeam).toEqual(rows.map((r) => r.runTeamFte));
  });
});

describe('programme plan views: overrides, portfolio', () => {
  it('a WBS code override replaces the code of a single work package; an invalid or repeated one is ignored', () => {
    const base = loadCase('golden'), w = (v: Record<string, string>) => programmeWbs(casePlan(makeCtx(withValues(base, v)), 'P'));
    const pilot = (v: Record<string, string>) => w(v).find((n) => n.task?.kind === 'pilot')!;
    expect(pilot({ [WBS_KEY('pilot')]: '7.1' })).toMatchObject({ code: '7.1', overridden: true });
    expect(pilot({ [WBS_KEY('pilot')]: 'abc' }).overridden).toBe(false);
    expect(pilot({ [WBS_KEY('pilot')]: '1.1' })).toMatchObject({ overridden: false, duplicate: true });
  });
  it('the portfolio plan shifts each product\'s bars to its month 0; the portfolio Gantt reads productWindow', () => {
    const pf = { ...identical(loadCase('golden'), 3), maxConcurrentSetups: 1 }, k = consolidate(pf), c = makeCtx(loadCase('golden'));
    const p = portfolioPlan(c, k), O = programmeCalendar(c, 600, { showStages: true, hub: true }).onboardEnd;
    for (const v of k.products) expect(p.tasks.find((t) => t.kind === 'build' && t.productId === v.id)!.start).toBeCloseTo(O + v.month0, 9);
    const w = programmeWbs(p);
    expect(w.filter((n) => n.kind === 'product').map((n) => n.level)).toEqual([3, 3, 3]);
    const g = portfolioGantt(pf, k);
    for (const row of g.waves.flatMap((x) => x.products)) {
      const v = k.products.find((x) => x.id === row.id)!;
      expect(productWindow({ month0: v.month0, lead: v.lead, setupMonths: v.run.setupMonths, rampEnd: 0 }, g.totalM).from).toBe(row.from);
    }
  });
});
