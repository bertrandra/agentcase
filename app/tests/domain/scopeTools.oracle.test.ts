import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { activeStages, automationCurve, autoBase, funnelStage, maturityBounds } from '@/domain/scope/automation';
import { lifecycleCascade, statusDoc, statusLabel } from '@/domain/scope/lifecycleView';
import { phaseTiles } from '@/domain/scope/phaseTiles';
import { addPoint, curveOf, ensurePts, movePoint, removePoint, sampleRamps } from '@/domain/scope/scurve';

// Oracle extras recorded from the LEGACY page by tools/oracle-extras.d/scope.mjs (node tools/oracle.mjs).
const load = (name: string, id: string) => JSON.parse(readFileSync(`fixtures/extras/${name}/${id}.json`, 'utf8'));
const state = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const ids = readdirSync('fixtures/extras/scurveMath').map((f) => f.replace('.json', '')).sort();
const near = (got: unknown, exp: unknown, path = ''): void => {
  if (typeof exp === 'number') { expect(typeof got === 'number' && Math.abs(got - exp) <= 1e-6 * Math.max(1, Math.abs(exp)), `${path}: ${String(got)} vs ${exp}`).toBe(true); return; }
  if (Array.isArray(exp)) { expect((got as unknown[]).length, path).toBe(exp.length); exp.forEach((v, i) => near((got as unknown[])[i], v, `${path}[${i}]`)); return; }
  if (exp && typeof exp === 'object') { Object.keys(exp).forEach((k) => near((got as Record<string, unknown>)[k], (exp as Record<string, unknown>)[k], `${path}.${k}`)); return; }
  expect(got, path).toEqual(exp);
};
const byT = <T extends { t: number }>(l: T[]) => [...l].sort((a, b) => a.t - b.t);
const EVAL_AT = [1, 2, 3, 6, 9, 12, 18, 24, 30, 36, 48, 60];

describe('S-curve editor maths reproduces the legacy page', () => {
  it('has fixtures for the recipes of this group', () => expect(ids).toEqual(expect.arrayContaining(['golden', 'sc-logistic-4pt', 'sc-gompertz-4pt', 'sc-spline-5pt', 'sc-horizon-5', 'spline-custom'])));
  it.each(ids)('%s: curve samples, sampled ramps, add / remove / drag, ensure', (id) => {
    const exp = load('scurveMath', id), anchors = exp.anchors as number[];
    for (const r of exp.out) {
      const f = curveOf(r.fam, r.pts), where = `${id}/${r.fam}`;
      near(EVAL_AT.map(f), r.eval, `${where} eval`);
      expect(sampleRamps(r.fam, r.pts), `${where} ramps`).toEqual(r.ramps);
      const added = addPoint(r.pts, r.fam);
      near(byT(added), byT(r.add.pts), `${where} add`);
      expect(sampleRamps(r.fam, added), `${where} add ramps`).toEqual(r.add.ramps);
      const removed = removePoint(r.pts);
      near(removed, r.remove.pts, `${where} remove`);
      expect(sampleRamps(r.fam, removed), `${where} remove ramps`).toEqual(r.remove.ramps);
      for (const d of r.drag ?? []) near(movePoint(r.pts, d.i, d.t, d.a, exp.N), d.pts, `${where} drag ${d.i}→${d.t}/${d.a}`);
    }
    for (const e of exp.ensure) near(ensurePts(e.in, e.n, anchors), e.out, `${id} ensure N=${e.n}`);
  });
});

describe('maturity block of the S-curve section matches the legacy render', () => {
  it.each(ids)('%s', (id) => {
    const exp = load('scurveView', id), s = state(id), c = makeCtx(s), N = exp.N as number;
    const pts = ensurePts(s.scurve.pts, N, [1, 2, 3].map((i) => c.inp.p(`y${i}Ramp`))), f = curveOf(s.scurve.family, pts);
    near(pts, exp.pts, 'pts');
    expect(Math.round(f(N))).toBe(exp.endAd);
    near([1, 6, 12, 13, 24, 36, N].map(f), exp.curve, 'curve');
    const bounds = maturityBounds(c);
    exp.levels.forEach((l: { lvl: string; from: number; month: number | null }, i: number) => {
      expect(bounds[i]).toBe(l.from);
      const m = l.from <= 0 ? 1 : Array.from({ length: N }, (_, k) => k + 1).find((t) => f(t) >= l.from) ?? null;
      expect(m, l.lvl).toBe(l.month);
    });
  });
});

describe('automation chart and glass-ceiling funnel match the legacy figures', () => {
  it.each(ids)('%s', (id) => {
    const exp = load('automationView', id), c = makeCtx(state(id)), b = autoBase(c), a = automationCurve(c, b);
    near({ N: a.N, auto: a.auto, eff: a.eff, rampEnd: a.rampEnd, realEnd: a.realEnd, humanEnd: a.humanEnd, vfteEnd: a.vfteEndFte, team: a.team },
      { N: exp.N, auto: exp.auto, eff: exp.eff, rampEnd: exp.rampEnd, realEnd: exp.realEnd, humanEnd: exp.humanEnd, vfteEnd: exp.vfteEnd, team: exp.team });
    near(exp.real.map(([t]: [number, number]) => [t, a.real[t - 1]]), exp.real, 'real(t)');
    near(a.levels.map((l) => ({ lvl: l.lvl, month: l.month })), exp.levels, 'levels');
    near([1, Math.ceil(b.N / 2), b.N].map((t) => funnelStage(b, t)), exp.stages.map((st: Record<string, number>) => Object.fromEntries(Object.entries(st).filter(([k]) => k !== 'comp'))), 'stages');
    expect(activeStages(b)).toEqual(exp.active);
  });
});

describe('phase tiles and lifecycle cascade match the legacy render', () => {
  it.each(ids)('%s', (id) => {
    const c = makeCtx(state(id)), t = phaseTiles(c), pe = load('phaseTiles', id), le = load('lcView', id);
    expect(`${t.selected}/${t.total} art.`).toBe(pe.count);
    near(t.tiles.map((x) => ({ id: x.id, state: x.state, share: x.share, contrib: x.contrib, humanSup: x.humanSup, nStd: x.nStd, nReg: x.nReg, empty: x.empty })), pe.tiles, 'tiles');
    const lc = lifecycleCascade(c);
    expect(lc.label).toBe(le.label);
    expect(statusLabel(c.s)).toBe(le.label);
    near(lc.posture, le.posture);
    near(lc.rows.map((r) => ({ id: r.id, weight: r.weight, share: r.share })), le.rows, 'cascade');
    const doc = statusDoc(c.s);
    expect(doc.map((d) => [d.label + d.marker, d.blurb, `×${d.posture.toFixed(2)}`])).toEqual(le.doc.slice(0, doc.length));
  });
});
