import { describe, expect, it } from 'vitest';
import {
  consolidate, cyclicWaves, dependencyTargets, resolveSchedule, scheduledProducts, setMaxConcurrentSetups, setWaveDependency, validate,
  type Portfolio, type Product, type Wave,
} from '@/domain/portfolio';
import { removeWave } from '@/domain/portfolio/waveOps';
import { openPortfolioFixture } from '../../helpers/portfolioFixtures';

const prod = (id: string, waveId: string | null, offsetMonths = 0): Product =>
  ({ id, name: id.toUpperCase(), teamIn: [], knowledge: {}, overrides: {}, waveId, offsetMonths });
const wave = (id: string, startMonth: number, productIds: string[], dependsOn?: Wave['dependsOn']): Wave =>
  ({ id, name: `W-${id}`, startMonth, productIds, ...(dependsOn ? { dependsOn } : {}) });
/** a: p1, p2 (offset 2) from month 0; b: p3 from month 3; c: p4 from month 1. Setups: p1 4, p2 6, p3 5, p4 3 months. */
const pf = (waves: Wave[], cap?: number): Portfolio => ({
  products: [prod('p1', 'a'), prod('p2', 'a', 2), prod('p3', 'b'), prod('p4', 'c')], waves, ...(cap ? { maxConcurrentSetups: cap } : {}),
} as unknown as Portfolio);
const SETUP: Record<string, number> = { p1: 4, p2: 6, p3: 5, p4: 3 };
const setup = (id: string) => SETUP[id] ?? 0;
const base = () => [wave('a', 0, ['p1', 'p2']), wave('b', 3, ['p3']), wave('c', 1, ['p4'])];
const m0 = (p: Portfolio) => Object.fromEntries(resolveSchedule(p, setup).month0);

describe('wave schedule: effective starts', () => {
  it('no dependency and no capacity: month0 = wave start + offset, setups never asked', () => {
    let asked = 0;
    const s = resolveSchedule(pf(base()), (id) => { asked++; return setup(id); });
    expect(Object.fromEntries(s.month0)).toEqual({ p1: 0, p2: 2, p3: 3, p4: 1 });
    expect(Object.fromEntries(s.starts)).toEqual({ a: 0, b: 3, c: 1 });
    expect(s.notes).toEqual([]); expect(asked).toBe(0);
  });
  it('after a wave starts + lag; the own start wins when it is later', () => {
    const w = base();
    w[2] = wave('c', 1, ['p4'], { waveId: 'b', milestone: 'start', lagMonths: 2 });
    expect(m0(pf(w)).p4).toBe(5);
    w[2] = wave('c', 9, ['p4'], { waveId: 'b', milestone: 'start', lagMonths: 2 });
    const s = resolveSchedule(pf(w), setup);
    expect(s.starts.get('c')).toBe(9); expect(s.notes).toEqual([]);
  });
  it("after a wave's last product finishes setup + lag (chain of two, declared out of order)", () => {
    const w = [wave('a', 0, ['p1', 'p2'], { waveId: 'b', milestone: 'setupEnd', lagMonths: 0 }), wave('b', 3, ['p3']), wave('c', 0, ['p4'],
      { waveId: 'a', milestone: 'setupEnd', lagMonths: 1 })];
    const s = resolveSchedule(pf(w), setup);
    // b: p3 3..8 -> a starts 8: p1 8..12, p2 10..16 -> c starts 16 + 1
    expect(Object.fromEntries(s.starts)).toEqual({ a: 8, b: 3, c: 17 });
    expect(s.notes.map((n) => [n.code, n.waveId])).toEqual([['wave-delayed', 'a'], ['wave-delayed', 'c']]);
    expect(s.notes[1]!.message).toContain('W-c: starts at month 17 instead of 0 — after W-a finishes the setup of its last product + 1 month(s)');
  });
  it('a cycle is flagged and ignored, never followed', () => {
    const w = [wave('a', 0, ['p1', 'p2'], { waveId: 'b', milestone: 'start', lagMonths: 1 }),
      wave('b', 3, ['p3'], { waveId: 'a', milestone: 'start', lagMonths: 1 }),
      wave('c', 0, ['p4'], { waveId: 'c', milestone: 'start', lagMonths: 0 })];
    expect([...cyclicWaves(w)].sort()).toEqual(['a', 'b', 'c']);
    const s = resolveSchedule(pf(w), setup);
    expect(Object.fromEntries(s.starts)).toEqual({ a: 0, b: 3, c: 0 });
    expect(s.notes.map((n) => n.code)).toEqual(['wave-dep-cycle', 'wave-dep-cycle', 'wave-dep-cycle']);
  });
  it('a dependency on an unknown wave is flagged and ignored', () => {
    const w = base();
    w[1] = wave('b', 3, ['p3'], { waveId: 'zz', milestone: 'start', lagMonths: 4 });
    const s = resolveSchedule(pf(w), setup);
    expect(s.starts.get('b')).toBe(3); expect(s.notes.map((n) => n.code)).toEqual(['wave-dep-unknown']);
  });
});

describe('wave schedule: transformation-team capacity', () => {
  it('pushes the later products back, in wave order then product order, and lists every push', () => {
    // cap 1: p1 0..4, p2 wants 2 -> 4..10, p3 wants 3 -> 10..15, p4 wants 1 -> 15..18
    const s = resolveSchedule(pf(base(), 1), setup);
    expect(Object.fromEntries(s.month0)).toEqual({ p1: 0, p2: 4, p3: 10, p4: 15 });
    expect(Object.fromEntries(s.pushed)).toEqual({ p2: 2, p3: 7, p4: 14 });
    expect(s.notes.map((n) => [n.code, n.productId])).toEqual([['setup-pushed', 'p2'], ['setup-pushed', 'p3'], ['setup-pushed', 'p4']]);
    // cap 2: p1 0..4, p2 2..8, p3 wants 3 (p1 and p2 busy) -> 4..9, p4 wants 1: two setups overlap until p2 ends -> 8..11
    expect(m0(pf(base(), 2))).toEqual({ p1: 0, p2: 2, p3: 4, p4: 8 });
    expect(m0(pf(base(), 9))).toEqual({ p1: 0, p2: 2, p3: 3, p4: 1 });
  });
  it('a setupEnd dependency sees the pushed setups', () => {
    const w = base();
    w[2] = wave('c', 0, ['p4'], { waveId: 'b', milestone: 'setupEnd', lagMonths: 0 });
    expect(m0(pf(w, 1))).toEqual({ p1: 0, p2: 4, p3: 10, p4: 15 });
  });
});

describe('wave dependency and capacity operations', () => {
  const p = pf(base());
  it('set / clear a dependency; refuse itself, an unknown wave and a cycle', () => {
    const a = setWaveDependency(p, 'b', { waveId: 'a', milestone: 'setupEnd', lagMonths: 2.7 });
    expect(a.waves[1]!.dependsOn).toEqual({ waveId: 'a', milestone: 'setupEnd', lagMonths: 2 });
    expect(setWaveDependency(a, 'b', null).waves[1]).not.toHaveProperty('dependsOn');
    expect(setWaveDependency(p, 'b', { waveId: 'b', milestone: 'start', lagMonths: 0 })).toBe(p);
    expect(setWaveDependency(p, 'b', { waveId: 'zz', milestone: 'start', lagMonths: 0 })).toBe(p);
    expect(setWaveDependency(a, 'a', { waveId: 'b', milestone: 'start', lagMonths: 0 })).toBe(a);
    expect(dependencyTargets(a, 'a').map((w) => w.id)).toEqual(['c']);
  });
  it('removing a wave drops the dependencies on it', () => {
    const a = setWaveDependency(p, 'b', { waveId: 'a', milestone: 'start', lagMonths: 1 });
    expect(removeWave(a, 'a').waves[0]).not.toHaveProperty('dependsOn');
  });
  it('capacity: whole >= 1, 0 / null clear it, the validator refuses a bad value', () => {
    expect(setMaxConcurrentSetups(p, 2.9).maxConcurrentSetups).toBe(2);
    expect(setMaxConcurrentSetups(setMaxConcurrentSetups(p, 2), 0)).not.toHaveProperty('maxConcurrentSetups');
    expect(setMaxConcurrentSetups(p, -1)).toBe(p);
    const f = openPortfolioFixture();
    expect(validate({ ...f, maxConcurrentSetups: 0 }).errors.map((e) => e.code)).toEqual(['capacity']);
    expect(validate({ ...f, waves: f.waves.map((w) => ({ ...w, dependsOn: { waveId: 'w1', milestone: 'x' as 'start', lagMonths: 0 } })) }).errors[0]!.code)
      .toBe('wave-dep');
  });
});

describe('the consolidation uses the effective starts (fixture)', () => {
  it('Wave 2 after Wave 1 finishes setup: its product starts at the end of the last setup of Wave 1', () => {
    const f = openPortfolioFixture(), before = consolidate(f);
    const g = setWaveDependency(f, 'wdr3dpo', { waveId: 'w1', milestone: 'setupEnd', lagMonths: 1 });
    const c = consolidate(g), w1 = scheduledProducts(g).filter((s) => s.wave.id === 'w1');
    const end = Math.max(...w1.map((s) => s.month0 + c.products.find((v) => v.id === s.product.id)!.run.profile));
    expect(c.products.find((v) => v.id === 'p299ec9')!.month0).toBe(Math.max(6, end + 1));
    expect(c.waves.find((w) => w.id === 'wdr3dpo')!.startMonth).toBe(Math.max(6, end + 1));
    expect(before.products.find((v) => v.id === 'p299ec9')!.month0).toBe(6);
    expect(c.summary.npv).not.toBe(before.summary.npv);
  });
});
