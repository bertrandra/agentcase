import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeCtx, model, type CaseState } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { lifecycleAutoPosture, statusTable } from '@/domain/lifecycle';
import { hubView } from '@/domain/tuneB/hub';
import { aiActBar, aiActKey, qualBar, qualityView, qualKey, riskBar, riskImpact, riskProb, riskScore, RISK_REGISTER, wave2RiskPremium } from '@/domain/tuneB/risk';
import { runSizingView, supervisionSplit } from '@/domain/tuneB/runSizing';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { agentRunTable, artifactRunTable, tokenModelRows, tokenUsage } from '@/domain/tuneB/tokens';

const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const load = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const extra = (name: string, id: string) => JSON.parse(readFileSync(`fixtures/extras/${name}/${id}.json`, 'utf8'));
const have = (id: string) => existsSync(`fixtures/extras/tuneBRisk/${id}.json`);
const near = (got: unknown, exp: unknown, path = ''): string[] => {
  if (typeof exp === 'number') return typeof got === 'number' && Math.abs(got - exp) <= 1e-6 * Math.max(1, Math.abs(exp)) ? [] : [`${path}: expected ${exp}, got ${String(got)}`];
  if (Array.isArray(exp)) return !Array.isArray(got) || got.length !== exp.length ? [`${path}: length ${(got as unknown[])?.length} vs ${exp.length}`] : exp.flatMap((v, i) => near(got[i], v, `${path}[${i}]`));
  if (exp && typeof exp === 'object') return Object.keys(exp).flatMap((k) => near((got as Record<string, unknown>)?.[k], (exp as Record<string, unknown>)[k], `${path}.${k}`));
  return exp === got ? [] : [`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`];
};
const rowOf = (r: { mix?: number; runs: number[]; total: number; tokM: number; cost: number }, lead: unknown[]) => [...lead, ...(r.mix != null ? [r.mix] : []), ...r.runs, r.total, r.tokM, r.cost];
const rounded = (a: unknown[]) => a.map((v) => (typeof v === 'number' ? Math.round(v) : v));

describe.each(ids.filter(have))('tune B domain vs legacy oracle: %s', (id) => {
  const c = makeCtx(load(id));
  it('token usage, model mix, agent runs and artefact runs', () => {
    const u = tokenUsage(c), e = extra('tuneBTokenUsage', id);
    expect(near({ totM: u.totM, y3: u.y3, inputM: u.inputM, outputM: u.outputM, tpa: u.tpa, agentRuns: u.agentRuns, runsY3: u.runsY3, blended: u.blended, mixTot: u.mixTotal, endL: u.endLabel }, e)).toEqual([]);
    const models = tokenModelRows(c).rows.map((r) => [r.name, r.mix, r.priceIn, r.priceOut, r.volM, r.cost]);
    expect(near(models.map((r) => [r[0], r[1], r[2], r[3], Number((r[4] as number).toFixed(1)), Math.round(r[5] as number)]), extra('tuneBTokenModels', id).map((r: unknown[]) => r.slice(0, 6).map((v, i) => (i === 5 ? Math.round(v as number) : v))))).toEqual([]);
    const ar = agentRunTable(c), legacyAr = extra('tuneBAgentRuns', id) as number[][];
    expect([...ar.rows.map((r) => rowOf(r, [])), rowOf(ar.totals, [])].map((r) => rounded(r.slice(0, -2)))).toEqual(legacyAr.map((r) => rounded(r.slice(1, -2))));
    const rt = artifactRunTable(c), legacyRt = extra('tuneBArtifactRuns', id) as number[][];
    expect(rt.rows.length + 1).toBe(legacyRt.length);
    rt.rows.forEach((r, i) => expect(rounded(rowOf(r, []).slice(0, -2))).toEqual(rounded((legacyRt[i] as number[]).slice(3, -2))));
    expect(Math.round(rt.totals.cost)).toBe(Math.round((legacyRt[legacyRt.length - 1] as number[]).slice(-1)[0] as number));
  });
  it('run-team sizing and supervision split', () => {
    const v = runSizingView(c), s = supervisionSplit(c), e = extra('tuneBRunSizing', id);
    expect(near({ av: v.av, rt: v.rt, rc: v.rc, eff: v.eff, dev: s.devETP, sup: s.supETP, res: s.residualETP, share: s.supShare, avgSup: s.avgHumanSup }, e)).toEqual([]);
  });
  it('setup lines', () => {
    const b = setupBreakdown(c), e = extra('tuneBSetup', id);
    expect(b.lines.map((l) => l.amount)).toEqual([e.t, e.tr, e.c, e.g]);
  });
  it('risk, AI-Act tier and quality premium', () => {
    const q = qualityView(c), e = extra('tuneBRisk', id);
    expect(near({ score: riskScore(c), riskBar: riskBar(c), aiBar: aiActBar(c), aiKey: aiActKey(c), qualKey: qualKey(c), prem: q.premium, factor: q.factor, qualBar: qualBar(c), wave2: wave2RiskPremium(c), sdd: q.sdd,
      probs: RISK_REGISTER.map((r) => [riskProb(c, r), riskImpact(c, r)]) }, e)).toEqual([]);
  });
  it('knowledge hub read-out', () => {
    const h = hubView(c), e = extra('tuneBKnowledge', id), three = model(c).horizon === 3;
    const got = { on: h.on, asisScore: h.asisScore, asis: h.asisCC, tgt: h.target, mult: h.on ? h.mult : 1, dEff: h.dEff, dSav: h.dSav, kt: h.kt, hub: h.hubCost, effCap: h.effCap };
    // DEV-HORIZON-SUMS: the legacy delta summed the three-entry yearSav whatever the horizon; v19 sums the horizon's years (equal at 3 years).
    const { dSav: legacyDSav, ...rest } = e as Record<string, unknown>;
    expect(near(got, three ? e : rest)).toEqual([]);
    if (!three && h.on) {
      const off = makeCtx({ ...c.s, dom: { ...c.s.dom, checked: { ...c.s.dom.checked, khEnabled: false } } }, { rateScale: c.rateScale, tokenScale: c.tokenScale });
      expect(h.dSav).toBeCloseTo(headline(c).totalBenefit - headline(off).totalBenefit, 4);
      expect(Number.isFinite(legacyDSav as number)).toBe(true);
    }
  });
  it('lifecycle table and posture', () => {
    const e = extra('tuneBLifecycle', id), t = statusTable(c.s);
    expect(near({ table: t.map((s) => ({ id: s.id, p: s.autoPosture, w: s.weights })), posture: lifecycleAutoPosture(c.s) }, e)).toEqual([]);
  });
});
