import { describe, expect, it } from 'vitest';
import {
  calendarOf, consolidate, consolidationView, corePortfolio, envelopeCase, portfolioGantt, portfolioHeadline, scopeHeadline, validate, waveBoard, waveHeadline, type Portfolio,
} from '@/domain/portfolio';
import { expectClose, loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const golden = loadCase('golden');
/** p1 and B in w1 (B offset 2), C in w2 (month 6); D unplanned. Horizon extended so wave 2 fits. */
function four(): Portfolio {
  let pf = withWave(withProduct(withProduct(envelopeCase(golden), { id: 'B', offset: 2, teamIn: scaledTeam(golden, 2) }), { id: 'D', waveId: null }), 'w2', 6);
  pf = withProduct(pf, { id: 'C', waveId: 'w2', teamIn: scaledTeam(golden, 3) });
  return { ...pf, horizonMonths: pf.horizonMonths + 6 };
}

describe('scope headline (F17): single owners, equal to the domain headline', () => {
  it('portfolio scope is portfolioHeadline; a wave is the same function on its products', () => {
    const c = consolidate(four()), p = scopeHeadline(c, { kind: 'portfolio' })!, w = waveHeadline(c, 'w1')!;
    expect(p.label).toBe('Portefeuille');
    expect(p.headline).toBe(portfolioHeadline(c));
    expect(w.products).toBe(2);
    expectClose(w.net, c.waves[0]!.summary.net);
    expectClose(w.endYear.savings, c.products.filter((v) => v.waveId === 'w1').reduce((a, v) => a + v.series.savings.slice(Math.floor((c.horizon - 1) / 12) * 12).reduce((x, y) => x + y, 0), 0));
    expect(scopeHeadline(c, { kind: 'product' })).toBeNull();
    expect(scopeHeadline(c, { kind: 'wave', id: 'gone' })).toBeNull();
    expect(scopeHeadline(c, { kind: 'wave', id: 'w2' })!.label).toBe('w2');
  });
  it('automation and ceiling are weighted by the entry headcount of the products', () => {
    const c = consolidate(four()), h = portfolioHeadline(c);
    const w = c.products.map((v) => v.run.baseEtp), tot = w.reduce((a, b) => a + b, 0);
    expectClose(h.eff, c.products.reduce((a, v) => a + v.run.baseEtp * v.run.automation().eff, 0) / tot);
    expectClose(h.ceiling, c.products.reduce((a, v) => a + v.run.baseEtp * v.run.automation().ceiling, 0) / tot);
  });
  it('one product: the portfolio scope equals the product alone', () => {
    const c = consolidate(envelopeCase(golden)), h = portfolioHeadline(c), v = c.products[0]!;
    expectClose(h.eff, v.run.automation().eff);
    expectClose(h.velocityPct, v.run.velocityPct());
    expectClose(h.endYear.savings, v.run.endYear().savings);
  });
});

describe('consolidation view (A4 at view level)', () => {
  it('the totals line is the portfolio headline and the lines add up to it', () => {
    const pf = four(), c = consolidate(pf), v = consolidationView(pf, c), h = portfolioHeadline(c);
    expectClose(v.totals.npv, h.npv); expectClose(v.totals.net, h.net); expectClose(v.totals.setup, h.setup); expectClose(v.totals.savings, h.totalBenefit);
    for (const k of ['npv', 'net', 'setup', 'savings', 'run', 'etp', 'vfte'] as const) {
      expectClose(v.products.reduce((a, r) => a + r[k], 0), v.totals[k]);
      expectClose(v.waves.reduce((a, r) => a + r[k], 0), v.totals[k]);
    }
    expect(v.totals.paybackMonth).toBe(h.paybackMonth);
    expectClose(v.years.reduce((a, y) => a + y.net, 0), h.net);
  });
  it('the chart has the portfolio line and one per wave with products, one point per calendar month', () => {
    const pf = four(), v = consolidationView(pf, consolidate(pf));
    expect(v.chart.series.map((s) => s.label)).toEqual(['Portefeuille', 'Vague 1', 'w2']);
    expect(v.chart.series.every((s) => s.data.length === v.chart.labels.length)).toBe(true);
    expect(v.chart.labels).toHaveLength(pf.horizonMonths);
    expectClose(v.chart.series[0]!.data.at(-1)!, v.totals.net);
  });
  it('an unscheduled product is excluded and warned about; an archived one is excluded silently', () => {
    const pf = four(), v = consolidationView(pf, consolidate(pf));
    expect(v.excluded.map((e) => e.id)).toEqual(['D']);
    expect(v.diagnostics.map((d) => [d.code, d.productId])).toContainEqual(['unscheduled', 'D']);
    expect(v.products.map((r) => r.id)).not.toContain('D');
    const arch = { ...pf, products: pf.products.map((p) => (p.id === 'D' ? { ...p, archived: true } : p)) }, a = consolidationView(arch, consolidate(arch));
    expect(a.diagnostics.some((d) => d.code === 'unscheduled')).toBe(false);
    expect(a.excluded[0]).toMatchObject({ id: 'D', archived: true });
  });
  it('a product cut by the horizon and a capped preparation are reported', () => {
    const pf = { ...four(), horizonMonths: 10 }, v = consolidationView(pf, consolidate(pf));
    expect(v.diagnostics.some((d) => d.code === 'truncated' && d.productId === 'C')).toBe(true);
    const lead = { ...four(), products: four().products.map((p) => (p.id === 'B' ? { ...p, knowledge: { ktLeadMonths: 9 } } : p)) };
    expect(consolidationView(lead, consolidate(lead)).diagnostics.some((d) => d.code === 'kt-lead-clamped')).toBe(true);
  });
});

describe('wave board', () => {
  it('columns are the waves in order then the unplanned column; totals are the wave aggregates', () => {
    const pf = four(), c = consolidate(pf), cols = waveBoard(pf, c);
    expect(cols.map((x) => x.id)).toEqual(['w1', 'w2', null]);
    expect(cols[0]!.cards.map((x) => x.id)).toEqual(['p1', 'B']);
    expect(cols[2]!.cards.map((x) => x.id)).toEqual(['D']);
    expect(cols[2]!.totals).toBeNull();
    expectClose(cols[0]!.totals!.net, c.waves[0]!.summary.net);
    expectClose(cols[1]!.totals!.npv, c.waves[1]!.summary.npv);
    expect(cols[0]!.cards[1]).toMatchObject({ offset: 2, startLabel: calendarOf(pf).dateAt(2) });
    expect(cols[1]!.startLabel).toBe(calendarOf(pf).dateAt(6));
    expect(cols[2]!.cards[0]!.startLabel).toBeNull();
  });
  it('the calendar follows startDate when set', () => {
    const pf = { ...four(), startDate: '2027-01-01' };
    expect(calendarOf(pf).dateAt(6)).toBe('Jul 27');
    expect(waveBoard(pf, consolidate(pf))[1]!.startLabel).toBe('Jul 27');
  });
});

describe('portfolio Gantt (F18)', () => {
  it('one aggregated bar per wave with products; milestones of each product sit at month0 + their own month', () => {
    const pf = four(), c = consolidate(pf), g = portfolioGantt(pf, c);
    expect(g.waves.map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(g.unplanned).toEqual(['D']);
    const w1 = g.waves[0]!, b = w1.products.find((p) => p.id === 'B')!, own = c.products.find((v) => v.id === 'B')!.run.engine.milestones();
    expect(b.month0).toBe(2);
    expect(w1.from).toBe(Math.min(...w1.products.map((p) => p.from)));
    expect(w1.to).toBe(Math.max(...w1.products.map((p) => p.to)));
    const pay = own.find((m) => m.family === 'financial')!, shown = b.milestones.find((m) => m.family === 'financial');
    if (pay.month + 2 <= pf.horizonMonths) expect(shown!.month).toBe(pay.month + 2);
    expect(b.milestones.some((m) => m.label === 'First agent vFTE')).toBe(true);
    expect(g.waves[1]!.from).toBeGreaterThanOrEqual(6 - 0);
    expect(portfolioGantt(pf, c)).toBe(g);
  });
  it('a wave moved by k months moves its bar and milestones by k', () => {
    const pf = four(), moved = { ...pf, waves: pf.waves.map((w) => (w.id === 'w2' ? { ...w, startMonth: 9 } : w)), horizonMonths: pf.horizonMonths + 3 };
    const a = portfolioGantt(pf, consolidate(pf)).waves[1]!, b = portfolioGantt(moved, consolidate(moved)).waves[1]!;
    expect(b.from - a.from).toBe(3);
    const ma = a.products[0]!.milestones, mb = b.products[0]!.milestones;
    expect(mb[0]!.month - ma[0]!.month).toBe(3);
  });
});

describe('corePortfolio', () => {
  it('keeps its identity when only view state changes and changes when a figure input does', () => {
    const pf = four(), a = corePortfolio(pf);
    expect(corePortfolio({ ...pf, activeProductId: 'B' })).toBe(a);
    expect(corePortfolio({ ...pf, products: [...pf.products] })).not.toBe(a);
    expect(corePortfolio({ ...pf, horizonMonths: 99 })).not.toBe(a);
    expect(validate(a).errors).toEqual([]);
    expect(consolidate(corePortfolio({ ...pf, activeProductId: 'C' }))).toBe(consolidate(a));
  });
});
