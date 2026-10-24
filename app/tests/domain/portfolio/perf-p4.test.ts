import { describe, expect, it } from 'vitest';
import {
  consolidate, consolidationView, corePortfolio, knowledgeTable, portfolioGantt, scopeHeadline, validate, waveBoard, waveEffects, infraView, resolveProduct,
} from '@/domain/portfolio';
import { setActiveProduct, setProductOffset } from '@/controllers/product';
import { setDisplayScope } from '@/controllers/displayScope';
import { setTeamTotal } from '@/controllers/baseline';
import { addWave, assignWave } from '@/controllers/wave';
import { addProduct } from '@/controllers/product';
import { caseResultOf } from '@/store/hooks';
import { appStore } from '@/store/instance';
import { freshStore } from '../../store/helpers';
import { bestOf, bigPortfolio } from '../../helpers/portfolio';

const big = bigPortfolio, best = bestOf;

describe('P4 budgets (best of several runs): 20 products x 60 months', () => {
  const pf = big();
  const warm = () => { const c = consolidate(pf); consolidationView(pf, c); knowledgeTable(pf); return c; };

  it('the Consolidation view model (chart, tables, totals, diagnostics) builds in < 30 ms from the consolidation', () => {
    const c = warm();
    let k = 0;
    const ms = best(8, () => { k++; consolidationView({ ...pf, horizonMonths: 60 + (k % 2) }, c); });
    const v = consolidationView(pf, c);
    expect([v.products.length, v.waves.length, v.chart.series.length]).toEqual([20, 4, 5]);
    expect(ms).toBeLessThan(30);
  });

  it('consolidation + view model together (products warm) stay under 30 ms', () => {
    warm();
    let k = 0;
    const ms = best(8, () => { k++; const next = { ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: w.startMonth + (k % 2) })), horizonMonths: 60 + k }; consolidationView(next, consolidate(next)); });
    expect(ms).toBeLessThan(30);
  });

  it('switching the display scope (portfolio, wave, back) reads the memoised headlines in < 5 ms', () => {
    const c = warm();
    scopeHeadline(c, { kind: 'portfolio' }); scopeHeadline(c, { kind: 'wave', id: 'w2' });
    const ms = best(20, () => { scopeHeadline(c, { kind: 'portfolio' }); scopeHeadline(c, { kind: 'wave', id: 'w2' }); scopeHeadline(c, { kind: 'wave', id: 'w3' }); scopeHeadline(c, { kind: 'product' }); });
    expect(ms).toBeLessThan(5);
  });

  it('the wave board and the Gantt are cheap too (< 30 ms each)', () => {
    const c = warm();
    portfolioGantt(pf, c);
    expect(best(8, () => { waveBoard({ ...pf }, c); })).toBeLessThan(30);
    expect(best(8, () => { portfolioGantt({ ...pf }, { ...c }); })).toBeLessThan(30);
  });
});

describe('P4 budgets at store level: 20 products, one edit refreshes every view in < 150 ms', () => {
  /** What the hooks compute after a change: the active case, the product rows, the consolidation view, the Knowledge transfer view, the Gantt. */
  const refresh = () => {
    const p = appStore().getState().portfolio, core = corePortfolio(p), c = consolidate(core);
    caseResultOf(appStore().getState().doc);
    core.products.forEach((x) => caseResultOf(resolveProduct(core, x.id)));
    consolidationView(core, c); waveBoard(core, c); portfolioGantt(core, c);
    const t = knowledgeTable(core); waveEffects(core, t.rows); infraView(core, t.rows); validate(core);
  };
  function twenty() {
    freshStore();
    const w1 = appStore().getState().portfolio.waves[0]!.id, w2 = addWave('W2', 6)!;
    for (let i = 2; i <= 20; i++) addProduct('P' + i, i % 2 ? w1 : w2);
    refresh();
  }

  it('a team edit of one product', () => {
    twenty();
    const ids = appStore().getState().portfolio.products.map((p) => p.id);
    let n = 10;
    const ms = best(4, () => { setActiveProduct(ids[3]!); n += 3; setTeamTotal(n); refresh(); });
    expect(ms).toBeLessThan(150);
  });

  it('view-state changes (active product, display scope) recompute no figure: the core portfolio keeps its identity', () => {
    twenty();
    const s = appStore, a = corePortfolio(s().getState().portfolio), ids = s().getState().portfolio.products.map((p) => p.id);
    setActiveProduct(ids[5]!);
    setDisplayScope({ kind: 'portfolio' });
    expect(corePortfolio(s().getState().portfolio)).toBe(a);
    expect(consolidate(corePortfolio(s().getState().portfolio))).toBe(consolidate(a));
    expect(best(10, refresh)).toBeLessThan(30);
  });

  it('a wave move or an offset edit re-uses every product run (no engine rebuilt) and stays < 150 ms', () => {
    twenty();
    const s = appStore().getState().portfolio, ids = s.products.map((p) => p.id), before = consolidate(corePortfolio(s)).products.map((v) => v.run);
    const ms = best(3, () => { assignWave(ids[4]!, s.waves[1]!.id); setProductOffset(ids[7]!, 2); refresh(); assignWave(ids[4]!, s.waves[0]!.id); setProductOffset(ids[7]!, 0); refresh(); });
    const after = consolidate(corePortfolio(appStore().getState().portfolio)).products.map((v) => v.run);
    expect(after.every((r, i) => r === before[i])).toBe(true);
    expect(ms).toBeLessThan(150);
  });
});
