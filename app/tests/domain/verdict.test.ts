import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model } from '@/domain';
import { mcSeedOf, runMonteCarlo } from '@/domain/stress';
import { decide, evaluateStrategies, resultsCore, savingsBreakdown, stratNormalize, strategyDefsOf, strategyLocSplits, stratWeightsOf, STRATEGY_DEFS_DEFAULT } from '@/domain/verdict';
import { withoutDeviations } from '../helpers/deviations';
import { diff, extraIds, loadCase, loadExtra, problems } from '../helpers/extras';

const ctx = (id: string) => makeCtx(loadCase(id));
const each = (name: string) => it.each(extraIds(name));

describe('strategy evaluation, location splits and ranking reproduce the legacy', () => {
  it('the default definitions are the legacy ones', () => expect(strategyDefsOf(loadCase('golden'))).toEqual(STRATEGY_DEFS_DEFAULT));
  each('strategyEval')('evaluate %s', (id) => {
    const c = ctx(id);
    expect(problems('strategyEval', id, evaluateStrategies(c))).toEqual([]);
  });
  each('strategyLocSplits')('loc splits %s', (id) => {
    const c = ctx(id);
    expect(problems('strategyLocSplits', id, strategyLocSplits(c, strategyDefsOf(c.s)))).toEqual([]);
  });
  each('strategyRanking')('ranking %s', (id) => {
    const c = ctx(id);
    const got = stratNormalize(evaluateStrategies(c), stratWeightsOf(c.s)).map((o) => ({ id: o.id, norm: o.norm, score: o.score }));
    expect(problems('strategyRanking', id, got)).toEqual([]);
  });
});

describe('decision verdict reproduces the legacy decisionEngine()', () => {
  each('decisionRun')('%s', (id) => {
    const c = ctx(id), run = runMonteCarlo(c, 200, mcSeedOf(c)), d = decide(c, run);
    expect(problems('decisionRun', id, { verdict: d.verdict, confidence: d.confidence, stats: d.stats, p10Floor: d.p10Floor, drivers: d.drivers,
      conditions: d.conditions, ctx: d.ctx, setup: d.setup, premium: d.premium })).toEqual([]);
  });
  it('coherence invariant: never recommended when P(net<0) exceeds 20 %', () => {
    const c = ctx('golden'), base = runMonteCarlo(c, 100, 42);
    const d = decide(c, { stats: { ...base.stats, pNetNeg: 0.25, p10: 1e9 }, sens: base.sens });
    expect(d.verdict).not.toBe('strong');
  });
});

describe('results core reproduces the legacy aggregation', () => {
  // The legacy team shift clamps per skill; teamShift() is the aggregate. They agree on all 59 fixtures (no skill automates past its own size).
  each('resultsCore')('%s', (id) => {
    const c = ctx(id), r = resultsCore(c), out: string[] = [], e = loadExtra('resultsCore', id) as { tot: Record<string, number> };
    e.tot = { asis: e.tot.asis as number, human: e.tot.human as number, agent: e.tot.agent as number };   // reconciliation fields are legacy diagnostics
    diff(e, { net: r.net, roi: r.roi, payback: r.payback, B: r.last, years: savingsBreakdown(c), eff: r.eff, setup: r.setup, horizon: r.horizon, status: r.status, tot: r.team }, 'resultsCore', out);
    expect(withoutDeviations(out, id).slice(0, 6)).toEqual([]);   // DEV-PAYBACK-NOSETUP: econ-no-setup reads "Immediate"
    // DEV-FTE-ONE-DEF: the team shift is the Time Engine end year on the FTE owner's definition (the legacy: asis − asis × ramp × eff).
    const end = engineNow(c).years().at(-1)!;
    expect(r.team).toEqual({ asis: model(c).base.etp, human: end.totalHumanFteEnd, delivery: end.humanFteEnd, runTeam: end.runTeamFteEnd,
      agent: end.agentVfteEnd });
  });
});
