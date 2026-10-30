import { beforeEach, describe, expect, it } from 'vitest';
import { computeCase, makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { phaseTiles } from '@/domain/scope/phaseTiles';
import { curveOf } from '@/domain/scope/scurve';
import { phasesForScope } from '@/domain/scopeView';
import { resolveProduct, scopeLifecycle, scopeParams, scopePhases, scopeScurve, scopeSelection, spread, type Portfolio } from '@/domain/portfolio';
import { lifecycleAutoPosture } from '@/domain/lifecycle';
import { appStore } from '@/store/instance';
import { viewScopeOf } from '@/store/viewScope';
import { variedProducts, type Varied } from '../../helpers/aggFixture';
import { expectClose } from '../../helpers/portfolio';
import { scopeOf } from '@/domain/process';

let v: Varied, pf: Portfolio;
beforeEach(() => { v = variedProducts(); pf = appStore().getState().portfolio; });
const portfolio = () => viewScopeOf(pf, { kind: 'portfolio' }, v.ids[0]).productIds;
const wave1 = () => viewScopeOf(pf, { kind: 'wave', id: v.waves[0] }, v.ids[0]).productIds;
const ctxOf = (id: string) => makeCtx(resolveProduct(pf, id));

describe('selection: the unscheduled product is never part of the Portfolio nor of a Wave', () => {
  it('Portfolio = A, B, C; Wave 1 = A, B', () => {
    expect(portfolio()).toEqual(v.ids);
    expect(wave1()).toEqual([v.ids[0], v.ids[1]]);
    expect(viewScopeOf(pf, { kind: 'portfolio' }, v.ids[0]).excludedIds).toEqual([v.d]);
  });
});

describe('scopeParams = model(c) of each product (computeCase)', () => {
  it.each(['portfolio', 'wave'] as const)('%s', (k) => {
    const ids = k === 'portfolio' ? portfolio() : wave1(), a = scopeParams(pf, ids);
    expect(a.rows.map((r) => r.id)).toEqual(ids);
    const ref = ids.map((id) => computeCase(resolveProduct(pf, id)).model);
    a.rows.forEach((r, i) => { expectClose(r.potential, ref[i]!.auto); expectClose(r.effective, ref[i]!.eff); expectClose(r.ceiling, ref[i]!.ceiling); });
    expectClose(a.ceiling!.min, Math.min(...ref.map((m) => m.ceiling)));
    expectClose(a.ceiling!.max, Math.max(...ref.map((m) => m.ceiling)));
    expectClose(a.potential!.mean, ref.reduce((s, m) => s + m.auto, 0) / ref.length);
  });
  it('B forces its ceiling to 35 and the others compute it', () => {
    const a = scopeParams(pf, portfolio());
    expect(a.rows.map((r) => r.forced)).toEqual([false, true, false]);
    expectClose(a.rows[1]!.ceiling, 35);
  });
  it('spread of nothing is null', () => { expect(spread([])).toBeNull(); expect(scopeParams(pf, []).ceiling).toBeNull(); });
});

describe('scopeScurve = curveOf(family, points) sampled at 12 / 24 / 36 and at the horizon', () => {
  it.each(['portfolio', 'wave'] as const)('%s', (k) => {
    const ids = k === 'portfolio' ? portfolio() : wave1(), a = scopeScurve(pf, ids);
    expect(a.rows).toHaveLength(ids.length);
    const b = a.rows.find((r) => r.id === v.ids[1])!, c = ctxOf(v.ids[1]), N = engineNow(c).horizonMonths;
    const f = curveOf('gompertz', resolveProduct(pf, v.ids[1]).scurve.pts!);
    expect(b.family).toBe('gompertz');
    expect(b.horizonMonths).toBe(N);
    expect(b.y1).toBe(Math.round(f(Math.min(N, 12)))); expect(b.y2).toBe(Math.round(f(Math.min(N, 24)))); expect(b.endAdoption).toBe(Math.round(f(N)));
    expect(a.endAdoption!.max).toBeGreaterThanOrEqual(a.endAdoption!.min);
    expect(a.families.reduce((s, x) => s + x.count, 0)).toBe(ids.length);
  });
});

describe('scopePhases = phaseTiles of each product', () => {
  it.each(['portfolio', 'wave'] as const)('%s: counts of products keeping each phase', (k) => {
    const ids = k === 'portfolio' ? portfolio() : wave1(), a = scopePhases(pf, ids);
    for (const p of phasesForScope()) {
      const keep = ids.filter((id) => phaseTiles(ctxOf(id)).tiles.find((t) => t.id === p.id)!.state !== 'none').length;
      expect(a.productsIn[p.id]).toBe(keep);
    }
    const b = a.rows.find((r) => r.id === v.ids[1])!;
    expect(b.cells[phasesForScope()[0]!.id]!.state).toBe('none');
    expect(a.disabled).toBe(ids.filter((id) => scopeOf(resolveProduct(pf, id)).phaseOff.length > 0).length);
    expect(scopeOf(resolveProduct(pf, v.ids[1])).phaseOff).toContain(phasesForScope()[0]!.id);
  });
});

describe('scopeLifecycle = lifecycleAutoPosture of each product', () => {
  it.each(['portfolio', 'wave'] as const)('%s', (k) => {
    const ids = k === 'portfolio' ? portfolio() : wave1(), a = scopeLifecycle(pf, ids);
    a.rows.forEach((r) => expectClose(r.posture, lifecycleAutoPosture(resolveProduct(pf, r.id))));
    expect(a.using).toBe(ids.filter((id) => resolveProduct(pf, id).lifecycleUse).length);
    expect(a.rows.find((r) => r.id === v.ids[2])?.use ?? false).toBe(false);
    expect(a.rows.find((r) => r.id === v.ids[1])!.pos).toBe(70);
  });
});

describe('scopeSelection', () => {
  it.each(['portfolio', 'wave'] as const)('%s: totals are the sums of the products, B differs from common', (k) => {
    const ids = k === 'portfolio' ? portfolio() : wave1(), a = scopeSelection(pf, ids), n = ids.length;
    expect(a.total.sdlc).toBe(ids.reduce((s, id) => s + scopeOf(resolveProduct(pf, id)).selectedArtefacts.length, 0));
    const b = a.rows.find((r) => r.id === v.ids[1])!;
    const bc = ctxOf(v.ids[1]);
    expect(b.sdlc).toBe(bc.a.sdlc.filter((x) => bc.a.selected.has(x.id)).length);
    expect(b.sdlc).toBeLessThan(a.common.sdlc);
    expect(b.removed).toBeGreaterThan(0);
    expect(b.own).toBe(true);
    expect(a.rows.find((r) => r.id === v.ids[0])).toMatchObject({ added: 0, removed: 0, own: false });
    const all = ctxOf(ids[0]!).a.sdlc.length;
    expect(a.unanimous + a.contested.length).toBeLessThanOrEqual(all);
    expect(a.contested.length).toBe(a.contested.filter((x) => x.count > 0 && x.count < n).length);
    expect(a.contested.length).toBeGreaterThan(0);
    for (const p of a.phases) expect(a.total.phases[p.id]).toBe(a.rows.reduce((s, r) => s + (r.phases[p.id] ?? 0), 0));
  });
});
