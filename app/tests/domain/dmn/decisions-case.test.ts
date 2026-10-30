import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { checkDmn, decide, FAMILY_IDS, bindDecision, ruleFamilies, withDecisions, writeDmn, type DecidedActivity, type DmnModel } from '@/domain/dmn';
import { headline } from '@/domain/economics/headline';
import { setScope, type XDocument } from '@/domain/process';
import { addFlow, addGateway, setDefaultFlow } from '@/domain/process/profile';
import { caseDecisions } from '@/domain/decisionRules';
import { conditionContext, ruledOut } from '@/domain/scopeRules';
import { adding, custom, emptied, opened, withDoc } from '../../helpers/processCases';

/**
 * Phase B7b, F-B62: what the decisions feed. Reference case: the golden fixture emptied; in V3 the activities C001 (Human, Supervised autonomous,
 * 60 / 40), C002 (Agent, Copilot, 50 / 50) and the business-rule tasks C010 (bound to the supervision split) and C011 (bound to the authority).
 * The authority table gives Agent → Autonomous, Human → Assistance; the split table gives Autonomous → 10 / 90, Assistance → 80 / 20.
 */
const golden = opened('golden');
const rules: DmnModel = { id: 'dmn_case', name: 'Case rules', namespace: 'https://example.org/case', inputs: [{ id: 'in_act', name: 'activity' }], decisions: [
  { id: 'dec_auth', name: 'aiAuthority', requiredDecisions: [], requiredInputs: ['in_act'],
    table: { hitPolicy: 'UNIQUE', annotations: [], inputs: [{ expression: 'activity.type' }], outputs: [{ name: 'aiAuthority' }],
      rules: [{ inputs: ['"Agent"'], outputs: ['"Autonomous"'], annotations: [] }, { inputs: ['"Human"'], outputs: ['"Assistance"'], annotations: [] }] } },
  { id: 'dec_sup', name: 'supervision', requiredDecisions: ['dec_auth'], requiredInputs: [],
    table: { hitPolicy: 'UNIQUE', annotations: [], inputs: [{ expression: 'aiAuthority' }], outputs: [{ name: 'humanSup' }, { name: 'agentSup' }],
      rules: [{ inputs: ['"Autonomous"'], outputs: ['10', '90'], annotations: [] }, { inputs: ['"Assistance"'], outputs: ['80', '20'], annotations: [] }] } },
  { id: 'dec_route', name: 'route', requiredDecisions: [], requiredInputs: [],
    table: { hitPolicy: 'FIRST', annotations: [], inputs: [{ expression: 'industry' }], outputs: [{ name: 'route' }],
      rules: [{ inputs: ['"AERO"'], outputs: ['"regulated"'], annotations: [] }, { inputs: ['-'], outputs: ['"standard"'], annotations: [] }] } },
] };
const base = (): XDocument => adding(emptied(golden.BPMN), custom('C001'), custom('C002', { agentActivityType: 'Agent', aiAuth: 'Copilot', humanSup: 50,
  agentSup: 50 }), custom('C010', { agentActivityType: 'BusinessRule', effort: 1 }), custom('C011', { agentActivityType: 'BusinessRule', effort: 1 }));
const bound = (d: XDocument): XDocument => bindDecision(bindDecision(withDecisions(d, writeDmn(rules)), 'C010', 'dec_sup'), 'C011', 'dec_auth');
const caseOf = (d: XDocument, industry = ''): CaseState => withDoc(golden, d, { dom: { ...golden.dom, values: { ...golden.dom.values, industry } } });
const params = (s: CaseState, id: string) => { const a = makeCtx(s).a.sdlc.find((x) => x.id === id); return [a?.aiAuth, a?.humanSup, a?.agentSup]; };

describe('decisions set activity parameters (business-rule tasks bound to decisions)', () => {
  it('the default process holds no decision: nothing is evaluated, the artefacts are the views themselves', () => {
    expect(caseDecisions(golden, [], () => true)).toBeNull();
    expect(Object.keys(conditionContext(golden))).not.toContain('decision');
  });
  it('C010 (split) and C011 (authority) apply to the other activities of V3, document order: C001 → Assistance 80 / 20, C002 → Autonomous 10 / 90', () => {
    const s = caseOf(bound(base()));
    expect(params(s, 'C001')).toEqual(['Assistance', 80, 20]);
    expect(params(s, 'C002')).toEqual(['Autonomous', 10, 90]);
    // a rule task is not applied to itself; the authority table has no row for BusinessRule (null: nothing set)
    expect(params(s, 'C010')).toEqual(['Supervised autonomous', 60, 40]);
    expect(params(caseOf(base()), 'C001')).toEqual(['Supervised autonomous', 60, 40]);
  });
  it('a rule task out of scope applies nothing; the figures move only for the process with decisions', () => {
    const off = caseOf(setScope(bound(base()), ['C011'], false));
    expect(params(off, 'C001')).toEqual(['Supervised autonomous', 80, 20]);
    expect(headline(makeCtx(caseOf(bound(base())))).net).not.toBe(headline(makeCtx(caseOf(base()))).net);
    expect(headline(makeCtx(caseOf(withDecisions(base(), writeDmn(rules))))).net).toBe(headline(makeCtx(caseOf(base()))).net);
  });
  it('an unknown decision is reported, not applied', () => {
    const s = caseOf(bindDecision(bound(base()), 'C011', 'dec_missing'));
    expect(caseDecisions(s, [makeCtx(caseOf(base())).a.sdlc], () => true)?.errors).toContain('C011: decision "dec_missing" not found');
  });
});

describe('decisions feed the conditional scope (`decision.<id>`)', () => {
  const routed = (): XDocument => {
    let d = adding(withDecisions(base(), writeDmn(rules)), custom('C003', { effort: 3 }), custom('C004', { effort: 5 }));
    d = addGateway(d, 'V3', 'G1', 'exclusive', 'Regulated?');
    d = addFlow(d, 'V3', { id: 'F1', source: 'G1', target: 'C003', condition: 'decision.dec_route = "regulated"' });
    d = addFlow(d, 'V3', { id: 'F2', source: 'G1', target: 'C004' });
    return setDefaultFlow(d, 'G1', 'F2');
  };
  it('industry AERO → "regulated": C003 taken, C004 out; otherwise the default flow', () => {
    expect(conditionContext(caseOf(routed(), 'AERO'))['decision']).toEqual({ dec_auth: null, dec_sup: null, dec_route: 'regulated' });
    expect([...ruledOut(caseOf(routed(), 'AERO'))]).toEqual(['C004']);
    expect([...ruledOut(caseOf(routed(), 'AUTO'))]).toEqual(['C003']);
  });
});

describe('the three rule families (decision requirements, hand computed)', () => {
  const act = (id: string, type: string, value: string, aiAuth: string, humanSup: number, isReg = false): DecidedActivity =>
    ({ id, name: id, phase: 'V3', value, aiAuth, humanSup, agentSup: 100 - humanSup, effort: 1, isReg, agentActivityType: type });
  const acts = [act('a1', 'Human', 'VA', 'Copilot', 60), act('a2', 'Human', 'VA', 'Copilot', 40), act('a3', 'Human', 'VA', 'Assistance', 80),
    act('a4', 'Agent', 'VA', 'Autonomous', 10), act('a5', 'Human', 'REG', 'Compliance', 100, true)];
  const m = ruleFamilies(acts);
  const ctx = (a: DecidedActivity) => ({ activity: { type: a.agentActivityType ?? '', valueClass: a.value, regulatory: a.isReg === true } });
  it('authority: one UNIQUE row per class, the level most of its activities have (Human / VA / false → Copilot, 2 of 3)', () => {
    expect(checkDmn(m)).toEqual([]);
    expect(m.decisions[0]?.table?.rules.map((r) => [...r.inputs, ...r.outputs])).toEqual([['"Agent"', '"VA"', 'false', '"Autonomous"'],
      ['"Human"', '"REG"', 'true', '"Compliance"'], ['"Human"', '"VA"', 'false', '"Copilot"']]);
    expect(acts.map((a) => decide(m, FAMILY_IDS.authority, ctx(a)).value)).toEqual(['Copilot', 'Copilot', 'Copilot', 'Autonomous', 'Compliance']);
  });
  it('split per level requires the authority decision: Copilot → mean of 60 and 40 = 50 / 50; Autonomous → 10 / 90', () => {
    expect(decide(m, FAMILY_IDS.supervision, ctx(acts[2] as DecidedActivity)).value).toEqual({ humanSup: 50, agentSup: 50 });
    expect(decide(m, FAMILY_IDS.supervision, ctx(acts[3] as DecidedActivity)).value).toEqual({ humanSup: 10, agentSup: 90 });
  });
  it('quality gate (PRIORITY): regulatory → Formal review; agent-produced → Peer review; otherwise Spot check', () => {
    expect(acts.map((a) => decide(m, FAMILY_IDS.gate, ctx(a)).value)).toEqual(['Spot check', 'Spot check', 'Spot check', 'Peer review', 'Formal review']);
  });
  it('the checks an import applies: missing references and cycles', () => {
    const bad: DmnModel = { ...m, decisions: [{ id: 'x', name: 'x', requiredDecisions: ['y'], requiredInputs: ['nope'], literal: '1' },
      { id: 'y', name: 'y', requiredDecisions: ['x'], requiredInputs: [], literal: '2' }] };
    expect(checkDmn(bad).map((i) => `${i.at}: ${i.message}`)).toEqual(['x: required input "nope" not found', 'x: its requirements form a cycle',
      'y: its requirements form a cycle']);
    expect(decide(bad, 'x', {}).errors[0]).toBe('x: requirement cycle (x → y → x)');
  });
});
