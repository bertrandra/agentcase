import { describe, expect, it } from 'vitest';
import { undo } from '@/controllers/history';
import { setProductOffset } from '@/controllers/product';
import { setDisplayScope } from '@/controllers/displayScope';
import { consolidate, corePortfolio, portfolioScenarios, scenarioRuns } from '@/domain/portfolio';
import { expectClose } from '../helpers/portfolio';
import { threeProducts } from '../helpers/portfolioStore';

const core = (s: ReturnType<typeof threeProducts>['s']) => corePortfolio(s.getState().portfolio);
const net = (s: ReturnType<typeof threeProducts>['s'], ids: string[], key = 'ailoc') =>
  portfolioScenarios(core(s), ids).rows.find((r) => r.key === key)!.figures.net;

describe('portfolio scenarios in the store: commands move them, view changes do not', () => {
  it('moving a product in time keeps every scenario engine (memo per product run) and an undo restores the figures', () => {
    const { s, ids } = threeProducts(), before = consolidate(core(s)), engines = before.products.map((v) => scenarioRuns(v.run)), n0 = net(s, ids);
    expect(setProductOffset(ids[1], 4)).toBe(true);
    const after = consolidate(core(s));
    after.products.forEach((v, i) => expect(scenarioRuns(v.run)).toBe(engines[i]));
    expect(portfolioScenarios(core(s), ids).rows.find((r) => r.key === 'ailoc')!.products.find((p) => p.id === ids[1])!.month0)
      .toBe(before.products.find((v) => v.id === ids[1])!.month0 + 4);
    undo();
    expectClose(net(s, ids), n0);
  });
  it('switching the display scope is view state: the core portfolio, hence the memoised scenarios, stay the same object', () => {
    const { s, ids, waves } = threeProducts(), a = portfolioScenarios(core(s), ids);
    setDisplayScope({ kind: 'wave', id: waves[0] });
    expect(portfolioScenarios(core(s), ids)).toBe(a);
  });
});
