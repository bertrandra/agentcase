import { beforeAll, describe, expect, it } from 'vitest';
import { aggregateAnnual, aggregateMonthly, aggregateRun, consolidate, type Portfolio } from '@/domain/portfolio';
import { expectClose, expectSeriesClose } from '../../helpers/portfolio';
import { fourProducts } from '../../helpers/portfolioFixtures';
import { idsOf, scopesOf, shifted, sum } from '../../helpers/aggEPV';

let pf: Portfolio;
beforeAll(() => { pf = fourProducts(); });
const blocks = (a: number[]): number[] => Array.from({ length: Math.ceil(a.length / 12) }, (_, i) => sum(a.slice(i * 12, i * 12 + 12)));

describe('economics aggregates: Portfolio and every Wave, against the products\' own Time Engine months shifted by month0 (1e-9)', () => {
  it('has a Portfolio and two Waves to check', () => expect(scopesOf(pf)).toHaveLength(3));

  it('Run: calendar-year parts, product lines and total line', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateRun(pf, consolidate(pf), scope)!, ids = idsOf(pf, scope);
      const run = shifted(pf, ids, (r) => r.totalRunCost), tok = shifted(pf, ids, (r) => r.tokenCost), inf = shifted(pf, ids, (r) => r.infrastructureCost), kh = shifted(pf, ids, (r) => r.knowledgeHubCost);
      expectSeriesClose(a.years.map((y) => y.run), blocks(run));
      expectSeriesClose(a.years.map((y) => y.token), blocks(tok));
      expectSeriesClose(a.years.map((y) => y.infra), blocks(inf));
      expectSeriesClose(a.years.map((y) => y.kh), blocks(kh));
      expectSeriesClose(a.years.map((y) => y.team), blocks(run.map((x, i) => x - tok[i]! - inf[i]! - kh[i]!)));
      expect(a.rows.map((r) => r.id)).toEqual(ids);
      for (const k of ['run', 'team', 'token', 'infra', 'kh', 'etp'] as const) expectClose(sum(a.rows.map((r) => r[k])), a.totals[k]);
      expectClose(a.totals.run, sum(run));
      expectClose(sum(a.years.map((y) => y.run)), a.totals.run);
      expect(a.excluded.map((e) => e.name)).toEqual(['Archive (no wave)'].filter(() => scope.kind === 'portfolio'));
    }
  });

  it('Annual: years equal the headline years, year-end headcount, net by product adds up to the net by year', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateAnnual(pf, consolidate(pf), scope)!, ids = idsOf(pf, scope), etp = shifted(pf, ids, (r) => r.humanFte), vf = shifted(pf, ids, (r) => r.agentVfte);
      expectSeriesClose(a.years.map((y) => y.savings), blocks(shifted(pf, ids, (r) => r.grossSavings)));
      expectSeriesClose(a.years.map((y) => y.run), blocks(shifted(pf, ids, (r) => r.totalRunCost)));
      expectSeriesClose(a.years.map((y) => y.etp), a.years.map((_, i) => etp[Math.min(i * 12 + 11, etp.length - 1)]!));
      expectSeriesClose(a.years.map((y) => y.vfte), a.years.map((_, i) => vf[Math.min(i * 12 + 11, vf.length - 1)]!));
      expectClose(sum(a.years.map((y) => y.net)), a.headline.net);
      expectClose(a.years[a.years.length - 1]!.cum, a.headline.net);
      a.totalNet.forEach((t, i) => expectClose(sum(a.rows.map((r) => r.net[i] ?? 0)), t));
      expectSeriesClose(a.totalNet, a.years.map((y) => y.net));
    }
  });

  it('Monthly: one line per calendar month, cumulative cash ends on the net, chart = selection + products', () => {
    for (const scope of scopesOf(pf)) {
      const a = aggregateMonthly(pf, consolidate(pf), scope)!, ids = idsOf(pf, scope);
      expect(a.months).toHaveLength(consolidate(pf).horizon);
      expectSeriesClose(a.months.map((m) => m.run), shifted(pf, ids, (r) => r.totalRunCost));
      expectSeriesClose(a.months.map((m) => m.savings), shifted(pf, ids, (r) => r.grossSavings));
      expectSeriesClose(a.months.map((m) => m.etp), shifted(pf, ids, (r) => r.humanFte));
      expectSeriesClose(a.months.map((m) => m.vfte), shifted(pf, ids, (r) => r.agentVfte));
      expectClose(a.months[a.months.length - 1]!.cum, a.headline.net);
      expectClose(sum(a.months.map((m) => m.net)), a.headline.net);
      expect(a.chart.series).toHaveLength(1 + ids.length);
    }
  });

  it('a Product view or an unknown wave has no aggregate', () => {
    const c = consolidate(pf);
    for (const f of [aggregateRun, aggregateAnnual, aggregateMonthly]) { expect(f(pf, c, { kind: 'product' })).toBeNull(); expect(f(pf, c, { kind: 'wave', id: 'nope' })).toBeNull(); }
  });
});
