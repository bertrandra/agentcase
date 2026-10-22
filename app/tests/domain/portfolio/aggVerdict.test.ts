import { beforeAll, describe, expect, it } from 'vitest';
import { aggregateResults, aggregateStrategies, consolidate, resolveProduct, runOf, type Portfolio } from '@/domain/portfolio';
import { evaluateStrategies, resultsCore, stratNormalize, strategyDefsOf, stratWeightsOf } from '@/domain/verdict';
import { expectClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';
import { idsOf, scopesOf, sum } from '../../helpers/aggEPV';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });
const runs = (scope: Parameters<typeof idsOf>[1]) => idsOf(pf, scope).map((id) => runOf(resolveProduct(pf, id)));

describe('Results aggregate: Portfolio and every Wave', () => {
  it('decomposition and team shift are the sums of the products\' own resultsCore; the lines add up to the total (1e-9)', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateResults(pf, consolidate(pf), scope)!, cores = runs(scope).map((r) => resultsCore(r.ctx));
      for (const k of ['grossAuto', 'agentCost', 'relocation', 'netAuto', 'total'] as const) expectClose(a.last[k], sum(cores.map((r) => r.last[k])));
      expectClose(a.team.asis, sum(cores.map((r) => r.team.asis)));
      expectClose(a.team.human, sum(cores.map((r) => r.team.human)));
      expectClose(a.team.agent, sum(cores.map((r) => r.team.agent)));
      expect(a.rows.map((r) => r.status)).toEqual(cores.map((r) => r.status));
      for (const k of ['net', 'setup'] as const) { expectClose(sum(a.rows.map((r) => r[k])), a.totals[k]); expectClose(a.totals[k], a.headline[k]); }
      expectClose(a.totals.roi ?? NaN, a.totals.net / a.totals.setup);
      expectClose(a.totals.eff, a.headline.eff);
      a.rows.forEach((r, i) => expectClose(r.eff, runs(scope)[i]!.automation().eff));
    }
  });
});

describe('Strategies aggregate: Portfolio and every Wave', () => {
  it('each product line is the first-ranked strategy of its own comparison; the roll-up adds the recommendations up', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateStrategies(pf, consolidate(pf), scope)!, rs = runs(scope);
      expect(a.rows).toHaveLength(rs.length);
      a.rows.forEach((r, i) => {
        const s = rs[i]!.ctx.s, top = stratNormalize(evaluateStrategies(rs[i]!.ctx, strategyDefsOf(s)), stratWeightsOf(s))[0]!;
        expect(r.strategyId).toBe(top.id);
        expect(r.id).toBe(idsOf(pf, scope)[i]);
        expect(r.score).toBe(top.score);
        expectClose(r.tco, top.row.computed.tco);
        expectClose(r.net, top.row.computed.net);
        expect(r.roi).toBe(top.row.computed.roi);
      });
      expectClose(a.totals.tco, sum(a.rows.map((r) => r.tco)));
      expectClose(a.totals.net, sum(a.rows.map((r) => r.net)));
      expectClose(a.totals.setup, sum(a.rows.map((r) => r.setup)));
      expect(sum(a.mix.map((m) => m.count))).toBe(a.rows.length);
    }
  });
});
