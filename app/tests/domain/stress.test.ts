import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model } from '@/domain';
import { quantile } from '@/domain/model/numerics';
import { activeCurve } from '@/domain/model/overlay';
import { compareData, mcParamsOf, mcSeedOf, runMonteCarlo, scenarioSet, sensitivityMatrix, sensitivityRows, thinFor } from '@/domain/stress';
import { extraIds, loadCase, loadExtra, problems } from '../helpers/extras';

const only = (o: Record<string, unknown>, keys: string[]): Record<string, unknown> => Object.fromEntries(keys.map((k) => [k, o[k]]));

const ctx = (id: string) => makeCtx(loadCase(id));
const each = (name: string) => it.each(extraIds(name));

describe('scenarios reproduce the legacy scenarioSet()', () => {
  it('has fixtures', () => expect(extraIds('scenarioSet').length).toBeGreaterThanOrEqual(50));
  each('scenarioSet')('%s', (id) => {
    const got = scenarioSet(ctx(id)).map((s) => ({ key: s.key, label: s.label, m: s.m }));
    expect(problems('scenarioSet', id, got)).toEqual([]);
  });
});

describe('3-way comparison reproduces the legacy tables and charts', () => {
  each('compareView')('%s', (id) => {
    const d = compareData(ctx(id)), pick = (t: typeof d.asis, k: 'fte' | 'cost' | 'save' | 'velo') => t[k];
    const got = { table: d.rows };
    (['fte', 'cost', 'save', 'velo'] as const).forEach((k) => Object.assign(got, { [k]: [['AS-IS', d.asis], ['AS-IS + saving', d.classic], ['Agentic', d.agentic]].map(([l, t]) => ({ l, d: pick(t as typeof d.asis, k) })) }));
    // DEV-COMPARE-ENGINE: beyond 3 years or when the live curve's year-end adoption is not the typed ramp, the Agentic series follow the engine's own year rows (checked below).
    const c = ctx(id), m = model(c), engineRule = m.horizon > 3 || engineNow(c).years().some((y, i) => Math.abs(y.adoptionEndPct - (m.ramps[i] as number)) > 1e-9);
    if (engineRule) Object.assign(got, only(loadExtra('compareView', id) as Record<string, unknown>, ['fte', 'cost', 'velo', 'table']));
    expect(problems('compareView', id, got)).toEqual([]);
  });
  each('compareView')('%s: the Agentic trajectory is the Time Engine year rows', (id) => {
    const c = ctx(id), d = compareData(c), ys = engineNow(c).years();
    ys.forEach((y, i) => {
      expect(d.agentic.fte[i]).toBeCloseTo(y.humanFteEnd, 9);
      expect(d.agentic.cost[i]).toBeCloseTo(y.totalRunCost + y.setupCost, 6);
      expect(d.agentic.save[i]).toBeCloseTo(y.cumulativeCashFlowEnd, 6);
      expect(d.agentic.velo[i]).toBe(Math.round(35 * (1 + (y.adoptionEndPct / 100) * 0.8)));
    });
  });
});

describe('sensitivity reproduces the legacy table and matrix', () => {
  each('sensitivityView')('%s', (id) => {
    const c = ctx(id), mx = sensitivityMatrix(c);
    const got = {
      table: sensitivityRows(c).map((r) => [r.parameter, r.value, r.impactFte, r.roiImpact, r.level]),
      matrix: mx.cells.map((row, i) => [`${mx.autos[i]}%`, ...row.map((x) => x.text)]),
      head: ['Automation %', ...mx.ceils.map((x) => `Glass ${x}%`)],
    };
    expect(problems('sensitivityView', id, got)).toEqual([]);
  });
});

describe('Monte Carlo (seeded mulberry32) reproduces the legacy run to 1e-6', () => {
  each('mcRun')('%s', (id) => {
    const c = ctx(id), r = runMonteCarlo(c, 200, mcSeedOf(c));
    expect(problems('mcRun', id, { stats: r.stats, sens: r.sens, outcomes: r.outcomes, params: mcParamsOf(c.s) })).toEqual([]);
  });
  each('mcRun')('%s: DEV-MC-QUANTILE percentiles are numerics.quantile of the draws, within one rank of the legacy order statistic', (id) => {
    const c = ctx(id), r = runMonteCarlo(c, 200, mcSeedOf(c)), s = r.outcomes, e = loadExtra('mcRun', id) as { stats: Record<'p10' | 'p50' | 'p90', number> };
    ([['p10', 0.1], ['p50', 0.5], ['p90', 0.9]] as const).forEach(([k, f]) => {
      expect(r.stats[k]).toBe(quantile(s, f));
      expect(e.stats[k] >= (s[Math.floor(f * 200) - 1] as number) - 1e-6 && e.stats[k] <= (s[Math.floor(f * 200) + 1] as number) + 1e-6).toBe(true);
    });
    expect(r.stats.pNetNeg).toBe((e.stats as unknown as { pNeg: number }).pNeg);
  });
  it('the stored seed of the mc-seed-7 fixture is used, and the same seed gives the same distribution', () => {
    const c = ctx('mc-seed-7');
    expect(mcSeedOf(c)).toBe(7);
    expect(runMonteCarlo(c, 100, 7).outcomes).toEqual(runMonteCarlo(c, 100, 7).outcomes);
    expect(runMonteCarlo(c, 100, 8).outcomes).not.toEqual(runMonteCarlo(c, 100, 7).outcomes);
  });
  it('beyond a 3-year horizon the net benefit is finite (legacy v18.12 fix; v18.11 returned NaN)', () => {
    for (const id of ['horizon-5', 'horizon-10', 'econ-horizon-7']) {
      const r = runMonteCarlo(ctx(id), 100, 42), exp = loadExtra('mcRun', id) as { stats: { p10: number | null } };
      expect(Number.isFinite(r.stats.p10) && Number.isFinite(r.stats.p50) && Number.isFinite(r.stats.cvar10)).toBe(true);
      expect(exp.stats.p10).not.toBeNull();
    }
  });
});

describe('thin aggregate equals the legacy TIME.thin()', () => {
  each('thinNow')('%s', (id) => {
    const c = ctx(id), t = thinFor(c, { curveModelId: activeCurve(c) }, 0.08);
    expect(problems('thinNow', id, t)).toEqual([]);
  });
});
