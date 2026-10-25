import { describe, expect, it } from 'vitest';
import { engineNow } from '@/domain/canonical';
import {
  compareByProduct, envelopeCase, perProduct, scheduledProducts, portfolioMonteCarlo, productCtx, scenarioByProduct, selectionStress, sensitivityByProduct,
  type Portfolio,
} from '@/domain/portfolio';
import { compareData, scenarioSet, sensitivityMatrix, sensitivityRows } from '@/domain/stress';
import { expectClose, loadCase, scaledTeam, withProduct, withWave } from '../../helpers/portfolio';

const golden = loadCase('golden');
/** the envelope product and B in w1, C in w2, D unplanned; w3 is an empty wave. */
function four(): Portfolio {
  let pf = withWave(withWave(withProduct(withProduct(envelopeCase(golden), { id: 'B', offset: 2, teamIn: scaledTeam(golden, 2) }), { id: 'D', waveId: null }),
    'w2', 6), 'w3', 9);
  pf = withProduct(pf, { id: 'C', waveId: 'w2', teamIn: scaledTeam(golden, 3) });
  return { ...pf, horizonMonths: pf.horizonMonths + 6 };
}
const pf = four(), ids = pf.products.map((p) => p.id), planned = scheduledProducts(pf).map((s) => s.product.id);
const first = pf.products[0]!.id, w1 = pf.waves[0]!.id;

describe('perProduct', () => {
  it('keeps the asked order, ignores unknown ids and carries the wave name', () => {
    const rows = perProduct(pf, [ids[1]!, 'gone', first], (_c, p) => p.id);
    expect(rows.map((r) => r.id)).toEqual([ids[1], first]);
    expect(rows[1]!.wave).toBe(pf.waves.find((w) => w.id === pf.products[0]!.waveId)!.name);
  });
});

describe('selectionStress: the portfolio Monte Carlo restricted to the selection', () => {
  const run = portfolioMonteCarlo(pf, { draws: 300, seed: 7, rho: 0.3 });
  it('portfolio: the run itself', () => {
    const s = selectionStress(run, { kind: 'portfolio' })!;
    expect(s.stats).toBe(run.stats); expect(s.diversification).toBe(run.diversification); expect(s.products).toHaveLength(run.products.length);
      expect(s.outcomes).toBe(run.outcomes);
  });
  it('wave: its stats, its products, the diversification of its P10 against its products', () => {
    const s = selectionStress(run, { kind: 'wave', id: w1 })!, w = run.waves.find((x) => x.id === w1)!, mine = run.products.filter((p) => p.waveId === w1);
    expect(s.stats).toBe(w.stats); expect(s.products.map((p) => p.id)).toEqual(mine.map((p) => p.id)); expect(s.outcomes).toBe(w.outcomes);
    expectClose(s.diversification.p10, w.stats.p10);
    expectClose(s.diversification.sumP10, mine.reduce((a, p) => a + p.stats.p10, 0));
    expectClose(s.diversification.reduction, s.diversification.p10 - s.diversification.sumP10);
  });
  it('a wave without any product in the run, or an unknown wave, has no selection', () => {
    expect(selectionStress(run, { kind: 'wave', id: 'w3' })).toBeNull(); expect(selectionStress(run, { kind: 'wave', id: 'gone' })).toBeNull();
  });
});

describe('scenarioByProduct', () => {
  it('every cell is the product’s own scenarioSet (net = savings − setup)', () => {
    const rows = scenarioByProduct(pf, planned);
    expect(rows.map((r) => r.id)).toEqual(planned);
    for (const r of rows) {
      const set = scenarioSet(productCtx(pf, r.id));
      expect(r.cells.map((c) => c.key)).toEqual(set.map((s) => s.key)); expect(r.horizon).toBe(set[0]!.m.horizon);
      set.forEach((s, i) => {
        const c = r.cells[i]!;
        expectClose(c.setup, s.m.setup);
        expectClose(c.totBen, s.m.totBen);
        expectClose(c.net, s.m.totBen - s.m.setup);
        expect(c.roi).toBe(s.m.roi ?? null);
      });
    }
  });
});

describe('compareByProduct', () => {
  it('each line is the product’s compareData at the end of its horizon and the roll-up adds the lines', () => {
    const { rows, totals } = compareByProduct(pf, planned);
    for (const r of rows) {
      const c = productCtx(pf, r.id), d = compareData(c), last = d.labels.length - 1, e = engineNow(c).years();
      expectClose(r.agenticSave, d.agentic.save[last]!); expectClose(r.classicSave, d.classic.save[last]!); expectClose(r.asisFte, d.asis.fte[last]!);
        expectClose(r.agenticFte, d.agentic.fte[last]!);
      expectClose(r.vfte, e[Math.min(last, e.length - 1)]!.agentVfteEnd); expect(r.classicSaving).toBe(d.classicSaving);
    }
    for (const k of ['asisFte', 'classicFte', 'agenticFte', 'vfte', 'asisCost', 'classicCost', 'agenticCost', 'classicSave',
      'agenticSave'] as const) expectClose(totals[k], rows.reduce((a, r) => a + r[k], 0));
  });
  it('a wave selection adds only its own products', () => {
    const w = compareByProduct(pf, pf.waves[0]!.productIds), all = compareByProduct(pf, planned);
    expect(w.rows.length).toBeLessThan(all.rows.length); expect(w.totals.agenticSave).not.toBe(all.totals.agenticSave);
  });
});

describe('sensitivityByProduct', () => {
  it('parameters and matrix span are the product’s own', () => {
    for (const r of sensitivityByProduct(pf, planned)) {
      const c = productCtx(pf, r.id), rois = sensitivityMatrix(c).cells.flat().flatMap((x) => (x.roi == null ? [] : [x.roi]));
      expect(r.params).toEqual(sensitivityRows(c)); expect(r.most).toEqual(r.params[0]); expect(r.cells).toBe(rois.length);
      expectClose(r.roiLow as number, Math.min(...rois)); expectClose(r.roiHigh as number, Math.max(...rois));
        expect(r.negative).toBe(rois.filter((x) => x < 0).length);
    }
  });
});
