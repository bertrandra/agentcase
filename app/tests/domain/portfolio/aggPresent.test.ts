import { beforeAll, describe, expect, it } from 'vitest';
import { aggregateCommercial, aggregatePlayback, aggregateStory, consolidate, resolveProduct, runOf, scheduledProducts, weightedVelocity,
  type Portfolio } from '@/domain/portfolio';
import { cmRecommend, commercialView, type CmCode } from '@/domain/pdc/commercial';
import { playbackSeries } from '@/domain/pdc/playback';
import { storySummary } from '@/domain/pdc/story';
import { model } from '@/domain/model/overlay';
import { expectClose, expectSeriesClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';
import { idsOf, scopesOf, shifted, sum } from '../../helpers/aggEPV';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });
const runs = (scope: Parameters<typeof idsOf>[1]) => idsOf(pf,
  scope).map((id) => ({ id, run: runOf(resolveProduct(pf, id)), month0: scheduledProducts(pf).find((s) => s.product.id === id)!.month0 }));

describe('Monthly Playback aggregate: Portfolio and every Wave', () => {
  it('FTE, vFTE, cost and cumulative cash are the products\' months shifted by month0 (1e-9); index 0 is AS-IS', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregatePlayback(pf, consolidate(pf), scope)!, ids = idsOf(pf, scope), p = a.series, L = consolidate(pf).horizon;
      expect(p.months).toBe(L);
      expectSeriesClose(p.humanFte.slice(1), shifted(pf, ids, (r) => r.humanFte));
      expectSeriesClose(p.agentVfte.slice(1), shifted(pf, ids, (r) => r.agentVfte));
      expectClose(p.humanFte[0]!, sum(runs(scope).map((r) => r.run.baseEtp)));
      expectClose(p.totalCost[0]!, sum(runs(scope).map((r) => model(r.run.ctx).baselineRun / 12)));
      expectClose(sum(p.totalCost.slice(1)), sum(shifted(pf, ids, (r) => r.total)));
      expectClose(p.cumulative[L]!, a.headline.net);
      expectClose(sum(p.netMonth), a.headline.net);
    }
  });

  it('velocity and cost per point are the products\' own ramps weighted by entry headcount; the table adds up', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregatePlayback(pf, consolidate(pf), scope)!, rs = runs(scope), w = sum(rs.map((r) => r.run.baseEtp)), L = a.series.months;
      for (const T of [0, 1, 7, L]) {
        const at = (x: number[], m0: number) => x[Math.min(Math.max(T - m0, 0), x.length - 1)]!;
        expectClose(a.series.velocity[T]!, sum(rs.map((r) => r.run.baseEtp * at(playbackSeries(r.run.ctx).velocity, r.month0))) / w);
        expectClose(a.series.costPerSp[T]!, sum(rs.map((r) => r.run.baseEtp * at(playbackSeries(r.run.ctx).costPerSp, r.month0))) / w);
      }
      expectClose(a.totals.velocityPct, weightedVelocity(rs.map((r) => r.run)));
      expectClose(sum(a.rows.map((r) => r.net)), a.totals.net);
      expectClose(sum(a.rows.map((r) => r.baseEtp)), a.totals.baseEtp);
      expectClose(sum(a.rows.map((r) => r.etp)), a.totals.etp);
      expectClose(sum(a.rows.map((r) => r.vfte)), a.totals.vfte);
    }
  });
});

describe('Story aggregate: Portfolio and every Wave', () => {
  it('team, run cost and savings are the sums of the products\' own story; savings and payback are the consolidated ones', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateStory(pf, consolidate(pf), scope)!, rs = runs(scope), st = rs.map((r) => storySummary(r.run.ctx));
      expect(a.rows.map((r) => r.id)).toEqual(rs.map((r) => r.id));
      expectClose(a.story.baseFte, sum(st.map((s) => s.baseFte)));
      expectClose(a.story.tgtFte, sum(st.map((s) => s.tgtFte)));
      expectClose(a.story.baselineRun, sum(st.map((s) => s.baselineRun)));
      expectClose(a.story.velocityPct, weightedVelocity(rs.map((r) => r.run)));
      const ids = idsOf(pf, scope), year = shifted(pf, ids, (r) => r.grossSavings), last = a.story.years;
      expectClose(a.story.endSavings, sum(year.slice((last - 1) * 12)));
      expect(a.story.endLabel).toBe(`Year ${last}`);
      const c = consolidate(pf), w = scope.kind === 'wave' ? c.waves.find((x) => x.id === scope.id) : undefined;
      expect(a.story.paybackMonth).toBe((w ? w.summary : c.summary).paybackMonth);
    }
  });
});

describe('Commercial aggregate: Portfolio and every Wave', () => {
  it('each product line is its own commercial view on its selected model; the roll-up line adds the contracts up', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateCommercial(pf, consolidate(pf), scope)!, rs = runs(scope);
      expect(a.rows.map((r) => r.id)).toEqual(rs.map((r) => r.id));
      a.rows.forEach((r, i) => {
        const ctx = rs[i]!.run.ctx, code = (ctx.inp.v('cmModel') || 'ET') as CmCode;
        expect(r.selected).toBe(code);
        expect(r.recommended).toBe(cmRecommend(ctx)[0]);
        expect(r.row).toEqual(commercialView(ctx).rows.find((x) => x.code === code));
      });
      const ok = a.rows.filter((r) => r.row.available);
      expectClose(a.totals.revenue, sum(ok.map((r) => r.row.revenue)));
      expectClose(a.totals.margin, sum(ok.map((r) => r.row.margin)));
      expectClose(a.totals.margin, a.totals.revenue - a.totals.cost);
      expectClose(a.totals.marginPct, a.totals.revenue > 0 ? (a.totals.margin / a.totals.revenue) * 100 : 0);
    }
  });
});
