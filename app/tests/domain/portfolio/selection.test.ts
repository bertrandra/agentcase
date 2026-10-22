import { beforeAll, describe, expect, it } from 'vitest';
import { aggregateTeams, consolidate, inputSummary, keptMonths, overrideRefs, portfolioHeadline, resolveProduct, runOf, scheduledProducts, selectionView, waveHeadline, type Portfolio } from '@/domain/portfolio';
import { expectClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const ids = (): string[] => scheduledProducts(pf).map((s) => s.product.id);

describe('selectionView: the figures of a Portfolio / Wave selection (aggregate view)', () => {
  it('Portfolio: the headline IS the portfolio headline; the product lines add up to the total line (1e-9)', () => {
    const c = consolidate(pf), v = selectionView(pf, c, { kind: 'portfolio' })!;
    expect(v.headline).toBe(portfolioHeadline(c));
    expect(v.rows.map((r) => r.id)).toEqual(ids());
    for (const k of ['net', 'setup', 'savings', 'run', 'npv'] as const) expectClose(sum(v.rows.map((r) => r[k])), v.totals[k]);
    expectClose(v.totals.net, v.headline.net);
    expectClose(sum(v.years.map((y) => y.net)), v.headline.net);
    expect(v.excluded.map((e) => e.name)).toEqual(['Archive (no wave)']);
    expect(v.chart.series).toHaveLength(1 + v.rows.length);
  });

  it('each product line equals the product alone, shifted, within the horizon (independent derivation from the Time Engine months)', () => {
    const c = consolidate(pf), v = selectionView(pf, c, { kind: 'portfolio' })!;
    for (const s of scheduledProducts(pf)) {
      const rows = runOf(resolveProduct(pf, s.product.id)).rows, kept = keptMonths(c.horizon, s.month0, rows.length), row = v.rows.find((r) => r.id === s.product.id)!;
      expectClose(row.net, sum(rows.slice(0, kept).map((r) => r.netSavings)));
      expectClose(row.savings, sum(rows.slice(0, kept).map((r) => r.grossSavings)));
      expect(row.month0).toBe(s.month0);
    }
  });

  it('Wave: only that wave\'s planned products, with the wave headline and the wave line as total', () => {
    const c = consolidate(pf);
    for (const w of pf.waves) {
      const v = selectionView(pf, c, { kind: 'wave', id: w.id })!, own = c.waves.find((x) => x.id === w.id)!;
      expect(v.label).toBe(w.name);
      expect(v.headline).toBe(waveHeadline(c, w.id));
      expect(v.rows.map((r) => r.id)).toEqual(own.productIds);
      expectClose(sum(v.rows.map((r) => r.net)), v.totals.net);
      expectClose(v.totals.net, own.summary.net);
    }
  });

  it('a Product view or an unknown wave has no selection view; the view is memoised', () => {
    const c = consolidate(pf);
    expect(selectionView(pf, c, { kind: 'product' })).toBeNull();
    expect(selectionView(pf, c, { kind: 'wave', id: 'nope' })).toBeNull();
    expect(selectionView(pf, c, { kind: 'portfolio' })).toBe(selectionView(pf, c, { kind: 'portfolio' }));
  });
});

describe('aggregateTeams / inputSummary', () => {
  it('adds the entry teams: every breakdown sums to the total, and the total to the product lines', () => {
    const t = aggregateTeams(pf, ids()), own = pf.products.filter((p) => ids().includes(p.id)).map((p) => sum(p.teamIn.map((r) => +r.etp || 0)));
    expectClose(t.total, sum(own));
    for (const b of [t.bySkill, t.byGrade, t.byLoc, t.lines]) expectClose(sum(b.map((x) => x.etp)), t.total);
    expectClose(sum(t.products.map((p) => p.etp)), t.total);
    expect(t.products.map((p) => p.id)).toEqual(ids());
    expect(t.products.every((p) => p.planned)).toBe(true);
  });

  it('keeps the order asked, ignores unknown ids and flags an unplanned product', () => {
    const all = pf.products.map((p) => p.id), t = aggregateTeams(pf, ['ghost', ...all.slice().reverse()]);
    expect(t.products.map((p) => p.id)).toEqual(all.slice().reverse());
    expect(t.products.filter((p) => !p.planned).map((p) => p.name)).toEqual(['Archive (no wave)']);
    expect(aggregateTeams(pf, [])).toEqual({ products: [], total: 0, bySkill: [], byGrade: [], byLoc: [], lines: [] });
  });

  it('the input summary reads each product\'s own counts', () => {
    const rows = inputSummary(pf, pf.products.map((p) => p.id));
    expect(rows).toHaveLength(pf.products.length);
    for (const r of rows) {
      const p = pf.products.find((x) => x.id === r.id)!, c = resolveProduct(pf, r.id);
      expect(r.overrides).toBe(overrideRefs(p.overrides).length);
      expect(r.artefacts).toBe(c.selectedArtefacts.length);
      expect(r.wave).toBe(pf.waves.find((w) => w.id === p.waveId)?.name ?? '');
    }
    expect(rows.some((r) => r.overrides > 0)).toBe(true);
    expect(rows.filter((r) => !r.planned).map((r) => r.name)).toEqual(['Archive (no wave)']);
  });
});
