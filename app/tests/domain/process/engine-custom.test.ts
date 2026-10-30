import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model, type CaseState } from '@/domain';
import { teamWeights } from '@/domain/baseline/teamWeights';
import { tagMap } from '@/domain/factory/tags';
import { loopExternalReworkEffort } from '@/domain/model/loops';
import { cmTierSplit } from '@/domain/pdc/commercial';
import { VARIABLES } from '@/domain/pdc/variables';
import { caseLoopPairs, caseSkillMap, removeActivity, scopeOf, updateActivity, type XDocument } from '@/domain/process';
import { phaseScope } from '@/domain/scope';
import { agentDirectory, agentsOf } from '@/domain/verifyA';
import { valueRows } from '@/domain/verifyA/phaseArt';
import { adding, custom, emptied, opened, withAgent, withBoundary, withDoc, withPhase, withRole } from '../../helpers/processCases';

/**
 * Phase B5 gate (docs/SPEC_BPMN.md § 7 phase 2, § 11 item 6, F-B18): a custom activity, role or agent of the case's process enters the engine
 * like a catalogue artefact. Reference case: the golden fixture with every catalogue activity switched out of scope and the lifecycle weighting
 * off (weight w = effort), so each figure below is computed by hand from the custom activities alone (one test per parameter).
 */
const golden = opened('golden');
const ref = (d: (x: XDocument) => XDocument, patch: Partial<CaseState> = { lifecycleUse: false }): CaseState => withDoc(golden, d(emptied(golden.BPMN)), patch);
const ctx = (s: CaseState) => makeCtx(s);
const live = (s: CaseState) => { const c = makeCtx(s); return { c, m: model(c), eng: engineNow(c) }; };
const totAll = (s: CaseState): number => makeCtx(s).a.sdlc.reduce((t, a) => t + a.w, 0);

describe('custom activity: every parameter enters the engine (hand-computed)', () => {
  it('effort: the scope weight is the custom activity effort (7), the total gains it', () => {
    const before = ref((d) => d), s = ref((d) => adding(d, custom('C001'))), sc = phaseScope(ctx(s).a, s);
    expect(sc.count).toBe(1);
    expect(sc.selW).toBe(7);
    expect(sc.totW).toBe(totAll(before) + 7);
    expect(phaseScope(ctx(before).a, before).selW).toBe(0);
    const s2 = withDoc(s, updateActivity(s.BPMN, 'C001', { effort: 11 }));
    expect(phaseScope(ctx(s2).a, s2).selW).toBe(11);
  });
  it('phase and lifecycle weight: w = effort × lifecycle weight of its phase (a custom phase weighs 1.0)', () => {
    const on = { lifecycleUse: true, lifecyclePos: 0 }, s = ref((d) => adding(withPhase(d, 'P9'), custom('C001', { phase: 'P9' })), on);
    expect(phaseScope(ctx(s).a, s).selW).toBe(7);
    const v3 = ref((d) => adding(d, custom('C001')), on), lw = golden.statusLifecycle?.[0]?.weights?.V3 ?? 1;
    expect(phaseScope(ctx(v3).a, v3).selW).toBeCloseTo(7 * lw, 12);
  });
  it('supervision split: effort-weighted averages (7 × 40 + 3 × 90) / 10 = 55 agent, 45 human', () => {
    const s = ref((d) => adding(d, custom('C001'), custom('C002', { effort: 3, agentSup: 90, humanSup: 10 }))), sc = phaseScope(ctx(s).a, s);
    expect([sc.avgAgent, sc.avgHuman]).toEqual([55, 45]);
  });
  it('AI authority: the commercial tiers split the effort 0.7 (Copilot, T0) / 0.3 (Autonomous, T2)', () => {
    const s = ref((d) => adding(d, custom('C001', { aiAuth: 'Copilot' }), custom('C002', { effort: 3, aiAuth: 'Autonomous' })));
    const t = cmTierSplit(ctx(s));
    expect([t.t0, t.t1, t.t2]).toEqual([0.7, 0, 0.3]);
  });
  it('value class: counted in its category with its own supervision', () => {
    const s = ref((d) => adding(d, custom('C001'), custom('C002', { value: 'NVA', agentSup: 80, humanSup: 20 })));
    expect(valueRows(live(s))).toEqual([{ value: 'VA', n: 1, human: 60, agent: 40 }, { value: 'NVA', n: 1, human: 20, agent: 80 }]);
  });
  it('capability and type: the factory tags of a custom activity are its own (the process is their only source)', () => {
    const s = ref((d) => adding(d, custom('C001', { capability: 'Review', agentActivityType: 'Manual' })));
    expect(tagMap(ctx(s)).get('C001')).toEqual({ id: 'C001', storyId: null, capability: 'Review', agentActivityType: 'Manual' });
    expect(tagMap(ctx(s)).get('A017')).toEqual((golden as unknown as { fmArtefactTags: { id: string }[] }).fmArtefactTags.find((t) => t.id === 'A017'));
  });
  it('out of scope: counts in the total effort only, like a catalogue artefact', () => {
    const s = ref((d) => adding(d, { ...custom('C001'), inScope: false } as never)), sc = phaseScope(ctx(s).a, s);
    expect([sc.count, sc.selW, sc.totW]).toEqual([0, 0, totAll(ref((d) => d)) + 7]);
  });
});

describe('custom role and agent (hand-computed)', () => {
  it('catalogue role: the activity weight goes to its team skill (Dev: 7)', () => {
    const s = ref((d) => adding(d, custom('C001')));
    expect(teamWeights(ctx(s)).poolBySkill).toEqual({ Dev: 7 });
  });
  it('custom role: staffed by the team skill of its resource (Prompt engineering → Arch/Design: 7 + 3)', () => {
    const s = ref((d) => adding(withRole(d, 'Prompt engineering', 'Arch/Design'), custom('C001', { skill: 'Prompt engineering' }),
      custom('C002', { skill: 'Prompt engineering', effort: 3 })));
    expect(teamWeights(ctx(s)).poolBySkill).toEqual({ 'Arch/Design': 10 });
    expect(teamWeights(ctx(s)).totW).toBe(10);
    expect(scopeOf(s).skillMap?.['Prompt engineering']).toBe('Arch/Design');   // the case's own map (every fixture has one) holds it
    expect(caseSkillMap(s, undefined)['Prompt engineering']).toBe('Arch/Design');   // without one: the default map plus the custom roles
  });
  it('custom agent: joins the agent directory with its activities and their authority; the agent count gains one', () => {
    const s = ref((d) => adding(withAgent(d, 'Translation'), custom('C001', { agentActivityType: 'Agent', capability: 'Translation', aiAuth: 'Copilot' })));
    const c = ctx(s), mine = agentsOf(c).at(-1);
    expect(agentsOf(c)).toHaveLength(17);
    expect(mine).toEqual({ id: 'agent-translation', skill: 'Translation', aiAuth: 'Copilot', artifactIds: ['C001'], capacity: 25 });
    expect(agentDirectory(c, 'V3').find((r) => r.agent.id === 'agent-translation')).toMatchObject({ avgSup: 40, produced: 'C001 (Custom C001)' });
    expect(VARIABLES.find((v) => v.id === 'agentCatalogCount')?.get(c)).toBe(17);
    expect(agentsOf(ctx(golden))).toHaveLength(16);
  });
});

describe('rework from the model (D-B20: boundary events when present, back flows otherwise)', () => {
  const apply = { dom: { ...golden.dom, checked: { ...golden.dom.checked, loopExternalApply: true } }, lifecycleUse: false };
  const v4 = (d: XDocument) => adding(d, custom('C001'), custom('C002', { phase: 'V4', effort: 10 }));
  const lp001 = (s: CaseState) => loopExternalReworkEffort(ctx(s)).find((l) => l.id === 'LP001');
  it('back flow LP001 (10 % from V4, 40 % cost share): 10 × 0.1 × 0.4 = 0.4 w', () => {
    const s = ref(v4, apply);
    expect(lp001(s)?.rawAddedW).toBeCloseTo(0.4, 12);
    expect(lp001(s)?.rate).toBeCloseTo(0.4 / phaseScope(ctx(s).a, s).totW, 12);
  });
  it('a boundary event naming LP001 replaces it in place: 10 × 0.2 × 0.5 = 1.0 w', () => {
    const s = ref((d) => withBoundary(v4(d), { id: 'BE1', container: 'Process', on: 'V4', to: 'V3', p: 0.2, share: 0.5, pair: 'LP001' }), apply);
    expect(caseLoopPairs(s).map((l) => l.id)).toEqual(['LP001', 'LP002', 'LP003']);
    expect(lp001(s)?.rawAddedW).toBeCloseTo(1, 12);
  });
  it('a boundary event of its own is one more loop: on activity C002 within V4, 10 × 0.3 × 0.5 = 1.5 w', () => {
    const s = ref((d) => withBoundary(v4(d), { id: 'BE2', container: 'V4', on: 'C002', to: 'A023', p: 0.3, share: 0.5 }), apply);
    const pairs = caseLoopPairs(s);
    expect(pairs.map((l) => l.id)).toEqual(['LP001', 'LP002', 'LP003', 'BE2']);
    expect(pairs.at(-1)).toMatchObject({ artA: 'A023', artB: 'C002', extFrom: 'V4', extTo: 'V4', extReworkPct: 0.3, extCostShare: 0.5 });
    expect(loopExternalReworkEffort(ctx(s)).find((l) => l.id === 'BE2')?.rawAddedW).toBeCloseTo(1.5, 12);
  });
  it('removing an activity of a loop removes its rework flows (A017 is in all three)', () => {
    expect(caseLoopPairs(withDoc(golden, removeActivity(golden.BPMN, 'A017')))).toEqual([]);
    expect(caseLoopPairs(withDoc(golden, removeActivity(golden.BPMN, 'A023'))).map((l) => l.id)).toEqual(['LP002', 'LP003']);
  });
});
