import { beforeEach, describe, expect, it } from 'vitest';
import { LOCATIONS } from '@/domain';
import { teamEtp } from '@/domain/portfolio/alloc';
import { locationMix } from '@/domain/location';
import { ENGAGE_COEF } from '@/domain/catalog';
import { baselineLocStrat, frameEngage, frameEngagement, frameIndustry, productTeam, resolveProduct, type Portfolio } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { viewScopeOf } from '@/store/viewScope';
import { variedProducts, type Varied } from '../../helpers/aggFixture';
import { expectClose } from '../../helpers/portfolio';

let v: Varied, pf: Portfolio;
beforeEach(() => { v = variedProducts(); pf = appStore().getState().portfolio; });
const sel = (k: 'portfolio' | 'wave') => viewScopeOf(pf, k === 'portfolio' ? { kind: 'portfolio' } : { kind: 'wave', id: v.waves[0] }, v.ids[0]).productIds;
const KINDS = ['portfolio', 'wave'] as const;

describe.each(KINDS)('frameEngagement (%s)', (k) => {
  it('context and coefficients of each product come from the catalogue row', () => {
    const ids = sel(k), a = frameEngagement(pf, ids);
    expect(a.rows.map((r) => r.id)).toEqual(ids);
    const b = a.rows.find((r) => r.id === v.ids[1])!;
    expect(b.key).toBe('MSI'); expect(b.own).toBe(true);
    expectClose(b.maturityCap, ENGAGE_COEF.MSI!.maturityCap); expectClose(b.rampSpeed, ENGAGE_COEF.MSI!.rampSpeed);
    expect(a.rows[0]!.key).toBe('MSC'); expect(a.rows[0]!.own).toBe(false);
    expect(a.contexts.reduce((s, c) => s + c.count, 0)).toBe(ids.length);
    expectClose(a.discountPct!.min, a.discountRate!.min * 100);
    if (k === 'portfolio') expect(a.contexts.find((c) => c.key === 'STA')!.count).toBe(1);
  });
});

describe.each(KINDS)('frameEngage (%s)', (k) => {
  it('stage durations, runway and decision dates', () => {
    const ids = sel(k), a = frameEngage(pf, ids),
      // DEV-B9B-PILOT (D-B28): Pilot & Prove lasts the pilot (prove weeks + 2 × break-in sprints), no longer rmD4
      dw = (id: string) => { const x = resolveProduct(pf, id).dom.values, n = (k: string, d: number) => +(x[k] || d);
        return [...[1, 2, 3].map((i) => n(`rmD${i}`, 4)), n('pilotWeeks', 12) + 2 * n('pilotBreakin', 2)]; };
    a.rows.forEach((r) => { expect(r.weeks).toEqual(dw(r.id)); expect(r.totalWeeks).toBe(dw(r.id).reduce((s, x) => s + x, 0)); });
    expect(a.rows.find((r) => r.id === v.ids[1])!.weeks[0]).toBe(8);
    expect(a.totalWeeks!.max).toBe(32); expect(a.totalWeeks!.min).toBe(28);   // legacy (rmD4 = 6): 22 and 18
    expect(a.latestDecide >= a.earliestDecide).toBe(true);
  });
});

describe.each(KINDS)('frameIndustry (%s)', (k) => {
  it('profile, norms and regulated count', () => {
    const ids = sel(k), a = frameIndustry(pf, ids);
    expect(a.rows).toHaveLength(ids.length);
    expect(a.regulated).toBe(k === 'portfolio' ? 1 : 0);
    const c = a.rows.find((r) => r.id === v.ids[2]);
    if (c) { expect(c.code).toBe('MED'); expect(c.regUse).toBe(true); expect(c.norms).toBe(1); expect(c.regArtefacts).toBe(1); expect(c.own).toBe(true); }
    expect(a.industries.reduce((s, i) => s + i.count, 0)).toBe(ids.length);
  });
});

describe.each(KINDS)('baselineLocStrat (%s)', (k) => {
  it('FTE by location is the sum of the products; shares add up to 100', () => {
    const ids = sel(k), a = baselineLocStrat(pf, ids), teams = ids.map((id) => pf.products.find((p) => p.id === id)!);
    expectClose(a.fte, teams.reduce((s, p) => s + teamEtp(productTeam(pf, p.id)), 0));
    for (const l of LOCATIONS) expectClose(a.mix.find((m) => m.name === l.name)!.fte,
      ids.reduce((s, id) => s + locationMix(resolveProduct(pf, id)).byLoc[l.name]!, 0));
    expectClose(a.mix.reduce((s, m) => s + m.asisPct, 0), 100);
    expectClose(a.mix.reduce((s, m) => s + m.targetPct, 0), 100);
    const b = a.rows.find((r) => r.id === v.ids[1])!;
    expect(b.own).toBe(true); expect(b.fte).toBeGreaterThan(a.rows[0]!.fte);
    expect(a.rows[0]!.own).toBe(false);
  });
});
