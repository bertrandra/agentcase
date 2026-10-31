import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model, type Ctx } from '@/domain';
import { savingsBreakdown as econSavings, economicsView } from '@/domain/economics';
import { fmtE, fmtEur, fmtEurOrNA, fmtK, fmtSigned } from '@/domain/format';
import { autoCapFrom, clampAutoCap } from '@/domain/inputs';
import { groupColor } from '@/domain/nav/layout';
import { targetTeam as pdcTarget } from '@/domain/pdc/verifTeam';
import { maturityInfo as tuneMaturity } from '@/domain/tune/maturity';
import { opModelCompute } from '@/domain/tune/opmodel';
import { blankReadiness, readinessIndex as tuneReadiness } from '@/domain/tune/readiness';
import { tokenUsage as tuneBTokens } from '@/domain/tuneB/tokens';
import { riskScore } from '@/domain/tuneB/risk';
import { readinessIndex } from '@/domain/verdict/context';
import { riskScoreRaw } from '@/domain/verdict/risk';
import { savingsBreakdown } from '@/domain/verdict/results';
import { maturityInfo, targetTeam, tokenUsage } from '@/domain/verifyA';
import { withInputs } from '@/domain/stress/withInputs';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { VFA_FIXTURES } from '../helpers/verifyA';

const ctxOf = (id: string): Ctx => makeCtx(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))));
const live = (id: string) => { const c = ctxOf(id); return { c, m: model(c), eng: engineNow(c) }; };

// The pre-collapse implementations, kept here only to prove the owners return the same figures.
const oldRisk = (c: Ctx): number => {
  const reg: [string, number, number][] = [['inject', 3, 3], ['supply', 2, 3], ['secret', 2, 3], ['vendor', 2, 2], ['halluc', 3, 2], ['debt', 2, 3],
    ['pilot', 2, 2], ['cancel', 2, 3]];
  const st = (id: string, w: 'p' | 'i') => parseInt(c.inp.v(`risk_${w}_${id}`), 10);
  return reg.reduce((s, [id, p, i]) => s + ((st(id, 'p') || p) * (st(id, 'i') || i)) / 9, 0) / reg.length;
};
const KEYS = ['doc', 'proc', 'devops', 'cloud', 'sec', 'data', 'gov', 'sdlc', 'arch', 'skills'];
const oldReadiness = (ans: Record<string, (number | null)[]>): number | null => {
  const sc = KEYS.map((k) => { const a = (ans[k] ?? []).filter((v): v is number => v != null);
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }).filter((v): v is number => v != null);
  return sc.length ? sc.reduce((x, y) => x + y, 0) / sc.length : null;
};
const oldTarget = (c: Ctx) => {
  const ys = engineNow(c).years(), res = ys[ys.length - 1]!.humanFteEnd, m = model(c);
  return { residualETP: res, runETP: m.runAgenticETP, totalRecurrent: res + m.runAgenticETP };
};
const oldOm = (c: Ctx, m: ReturnType<typeof model>, yi: number) => {   // pdc/verifTeam.opModelCompute before the collapse
  let residual = m.yearETP[yi], ops = m.yearRunAgenticETP[yi];
  if (residual == null) { const ys = engineNow(c).years(), e = ys[ys.length - 1]!; residual = e.humanFteEnd; ops = e.runTeamFteEnd; }
  const res = residual || 0, lv = tuneMaturity(c, m).capped, revPerPod = lv <= 2 ? 1 : 0.5;
  let pod = Math.max(2, Math.min(4, c.inp.p('omPodSize') || 3)), o = { pods: 1, orch: 1, rev: 0, prec: 0, arch: 0, finops: 0, da: 0, lead: 0, eng: 0 };
  for (let g = 0; g < 300; g++) {
    const pods = Math.max(1, Math.ceil(res / pod)), prec = pods / (yi === 0 ? 3 : 6), arch = pods / 5, finops = yi === 0 ? 0.5 : 0.25, da = 0.5,
      lead = pods >= 4 ? 1 : 0.5;
    o = { pods, orch: pods, rev: pods * revPerPod, prec, arch, finops, da, lead, eng: res - pods - pods * revPerPod - (prec + arch) - (finops + da + lead) };
    if (o.eng >= 0 || pods <= 1) break;
    pod += 1;
  }
  return { pod, ...o, residual: res, ops: ops || 0, ok: o.eng >= 0, lvl: lv };
};
const oldCap = (raw: string | undefined): number => { const v = parseFloat(raw ?? ''); return isNaN(v) ? 100 : Math.max(10, Math.min(100, v)); };

describe('collapsed duplicates return the figures of the implementations they replaced', () => {
  it.each(VFA_FIXTURES)('%s: risk, readiness, maturity, target team, op model', (id) => {
    const { c, m, eng } = live(id);
    expect(riskScoreRaw(c)).toBe(oldRisk(c));
    expect(riskScore(c)).toBe(oldRisk(c));
    expect(readinessIndex(c.s)).toBe(oldReadiness((c.s as unknown as { readinessAns?: Record<string, (number | null)[]> }).readinessAns ?? {}));
    expect(maturityInfo({ c, m, eng })).toEqual(tuneMaturity(c, m));
    const t = targetTeam({ c, m, eng }), o = oldTarget(c);
    expect(pdcTarget(c)).toEqual(t);
    expect(t.residualETP).toBe(o.residualETP);
    // DEV-TEAM-RUN-END: the run team is the horizon end year's (the old one read the three-entry model, year 3); identical up to a 3-year horizon.
    const end = eng.year(eng.horizonYears);
    expect([t.runETP, t.totalRecurrent]).toEqual([end.runTeamFteEnd, end.totalHumanFteEnd]);
    if (eng.horizonYears <= 3) { expect(t.runETP).toBeCloseTo(o.runETP, 9); expect(t.totalRecurrent).toBeCloseTo(o.totalRecurrent, 9); }
    for (const yi of [0, 2]) {
      const a = oldOm(c, m, yi), b = opModelCompute(c, yi, m);
      expect(a).toEqual({ pod: b.pod, pods: b.pods, orch: b.orch, rev: b.rev, prec: b.prec, arch: b.arch, finops: b.finops, da: b.da, lead: b.lead,
        eng: b.eng, residual: b.residual, ops: b.ops, ok: b.ok, lvl: b.lvl });
    }
  });
  it.each(VFA_FIXTURES)('%s: savings decomposition, token usage, cumulative cash-flow, memo', (id) => {
    const { c, m, eng } = live(id), v = economicsView(c);
    expect(savingsBreakdown(c)).toEqual(econSavings(c).years);
    const u = tuneBTokens(c), w = tokenUsage({ c, m, eng });
    expect({ totM: w.totM, y3: w.y3, inputM: w.inputM, outputM: w.outputM, tpa: w.tpa, agentRuns: w.agentRuns, endLabel: w.endLabel }).toEqual({ totM: u.totM,
      y3: u.y3, inputM: u.inputM, outputM: u.outputM, tpa: u.tpa, agentRuns: u.agentRuns, endLabel: u.endLabel });
    // the cumulative cash-flow is the engine's own year-end cumulative (one owner); it is the "running savings - setup spent so far" sum up to
    // rounding (B9b, DEV-B9B-SETUP-SPREAD / -COACHING: the programme cost is spent over the horizon, so the setup is no longer all spent in year 1)
    let cum = 0;
    expect(v.cumulative).toEqual(v.years.map((y) => y.cumulativeCashFlowEnd));
    v.years.forEach((y, i) => expect(v.cumulative[i]).toBeCloseTo((cum += y.savings - y.setupCost), 4));
    expect(v.years.reduce((a, y) => a + y.setupCost, 0)).toBeCloseTo(v.setup, 4);
    expect(model(c)).toBe(model(c));   // computed once per context
    expect(engineNow(c)).toBe(engineNow(c));
  });
  it('a mutated-copy context is a new identity and never reads a stale model', () => {
    const c = ctxOf(VFA_FIXTURES[0] as string), base = model(c), copy = withInputs(c, { horizon: '5' });
    expect(model(copy)).not.toBe(base);
    expect(model(c)).toBe(base);
    expect(engineNow(copy)).not.toBe(engineNow(c));
  });
  it('autoTechCap, group colour and the euro family keep their text', () => {
    for (const raw of [undefined, '', 'x', '0', '5', '10', '55.5', '100', '250', '-3']) expect(autoCapFrom(raw)).toBe(oldCap(raw));
    expect([clampAutoCap(NaN), clampAutoCap(4), clampAutoCap(130)]).toEqual([100, 10, 100]);
    expect([groupColor({ a: '#fff', b: 'red' }, 'a'), groupColor({ b: 'red' }, 'b'), groupColor(undefined, 'a'), groupColor({}, undefined)]).toEqual(['#fff',
      '#667089', '#667089', '#667089']);
    expect([fmtE(1234.5), fmtK(1704000), fmtK(-15000), fmtEur(-99190), fmtEurOrNA(NaN), fmtEurOrNA(-5), fmtSigned(-99190)]).toEqual(['€1,235', '€1,704K',
      '−€15K', '−€99,190', 'n/a', '−€5', '−€99,190']);
    expect(tuneReadiness(blankReadiness())).toBeNull();
  });
});
