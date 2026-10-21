import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { activeCurve } from '@/domain/model/overlay';
import { compareData, mcParamsOf, mcSeedOf, runMonteCarlo, scenarioSet, sensitivityMatrix, sensitivityRows, thinFor } from '@/domain/stress';
import { extraIds, loadCase, loadExtra, problems } from '../helpers/extras';

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
    expect(problems('compareView', id, got)).toEqual([]);
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
  it('the stored seed of the mc-seed-7 fixture is used, and the same seed gives the same distribution', () => {
    const c = ctx('mc-seed-7');
    expect(mcSeedOf(c)).toBe(7);
    expect(runMonteCarlo(c, 100, 7).outcomes).toEqual(runMonteCarlo(c, 100, 7).outcomes);
    expect(runMonteCarlo(c, 100, 8).outcomes).not.toEqual(runMonteCarlo(c, 100, 7).outcomes);
  });
  it('legacy limitation kept: beyond a 3-year horizon the net benefit is undefined', () => {
    const c = ctx('horizon-5'), r = runMonteCarlo(c, 100, 42);
    expect((loadExtra('mcRun', 'horizon-5') as { stats: { p10: unknown } }).stats.p10).toBeNull();
    expect(Number.isNaN(r.stats.p10)).toBe(true);
  });
});

describe('thin aggregate equals the legacy TIME.thin()', () => {
  each('thinNow')('%s', (id) => {
    const c = ctx(id), t = thinFor(c, { curveModelId: activeCurve(c) }, 0.08);
    expect(problems('thinNow', id, t)).toEqual([]);
  });
});
