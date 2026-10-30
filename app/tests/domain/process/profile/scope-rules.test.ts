import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { hasScopeRules, scopeRules } from '@/domain/process/conditions';
import { exportDocument, serialize, type XDocument } from '@/domain/process';
import { addFlow, addGateway, FEEL_URI, setCondition, setDefaultFlow } from '@/domain/process/profile';
import { caseScopeRules, conditionContext, ruledOut } from '@/domain/scopeRules';
import { phaseScope } from '@/domain/scope';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../../helpers/bpmnValidate';
import { adding, custom, emptied, opened, withDoc } from '../../../helpers/processCases';

/**
 * Phase B5b, F-B51 / D-B22: conditional scope. Gateways with FEEL conditions on their flows take activities out of scope by rules on the case's
 * parameters; the selection screens set those parameters. Reference case: the golden fixture emptied, C001 (effort 7), C002 (effort 3) and
 * C003 (effort 5, after C001 on the same branch) in V3, a gateway G1 choosing between C001 (condition) and C002 (default flow).
 */
const golden = opened('golden');
const doc = (kind: 'exclusive' | 'inclusive' = 'exclusive', cond = 'industry = "AERO"'): XDocument => {
  let d = adding(emptied(golden.BPMN), custom('C001'), custom('C002', { effort: 3 }), custom('C003', { effort: 5 }));
  d = addGateway(d, 'V3', 'G1', kind, 'Aerospace?');
  d = addFlow(d, 'V3', { id: 'F1', source: 'G1', target: 'C001', condition: cond });
  d = addFlow(d, 'V3', { id: 'F2', source: 'G1', target: 'C002' });
  d = addFlow(d, 'V3', { id: 'F3', source: 'C001', target: 'C003' });
  return setDefaultFlow(d, 'G1', 'F2');
};
const caseOf = (d: XDocument, industry?: string): CaseState =>
  withDoc(golden, d, { lifecycleUse: false, dom: { ...golden.dom, values: { ...golden.dom.values, industry: industry ?? '' } } });

describe('scope rules evaluated on the case', () => {
  it('the default process has no rule: nothing is ruled out, no context is built', () => {
    expect(hasScopeRules(golden.BPMN.root)).toBe(false);
    expect(caseScopeRules(golden)).toBeNull();
    expect(ruledOut(golden).size).toBe(0);
  });
  it('exclusive: industry AERO takes C001 and the branch after it (7 + 5), else the default flow C002 (3)', () => {
    const aero = caseOf(doc(), 'AERO'), auto = caseOf(doc(), 'AUTO');
    expect([...ruledOut(aero)]).toEqual(['C002']);
    expect([...ruledOut(auto)].sort()).toEqual(['C001', 'C003']);
    expect(phaseScope(makeCtx(aero).a, aero)).toMatchObject({ count: 2, selW: 12 });
    expect(phaseScope(makeCtx(auto).a, auto)).toMatchObject({ count: 1, selW: 3 });
  });
  it('inclusive: every true condition is taken; the default only when none holds', () => {
    const d = setDefaultFlow(setCondition(doc('inclusive', 'regInclude'), 'F2', 'count(norms) >= 0'), 'G1', null);
    expect([...scopeRules(doc('inclusive', 'regInclude').root, { regInclude: true }).ruledOut]).toEqual(['C002']);
    expect([...scopeRules(doc('inclusive', 'regInclude').root, { regInclude: false }).ruledOut].sort()).toEqual(['C001', 'C003']);
    expect(scopeRules(d.root, { regInclude: true, norms: [] }).ruledOut.size).toBe(0);
    expect([...scopeRules(d.root, { regInclude: false, norms: [] }).ruledOut].sort()).toEqual(['C001', 'C003']);
  });
  it('a condition that cannot be decided is taken and reported; a text outside the subset is reported as invalid', () => {
    const r = scopeRules(doc('exclusive', 'lifecycle = "run"').root, {});
    expect(r.unknown.map((b) => b.flow)).toEqual([]);
    const u = scopeRules(doc('exclusive', 'size > 3').root, {});
    expect(u.unknown.map((b) => b.flow)).toEqual(['F1']);
    expect([...u.ruledOut]).toEqual(['C002']);
    expect(scopeRules(doc('exclusive', 'size >> 3').root, {}).invalid).toEqual([{ flow: 'F1', error: 'unexpected ">"' }]);
  });
  it('the context: the case parameters a condition reads', () => {
    const c = conditionContext(caseOf(doc(), 'AERO'));
    expect(c).toMatchObject({ industry: 'AERO', regInclude: true, lifecycle: null });
    expect(Object.keys(c).sort()).toEqual(['checked', 'industries', 'industry', 'lifecycle', 'norms', 'phasesOff', 'regInclude', 'values']);
  });
});

describe('conditions in the file', () => {
  it('written as FEEL formal expressions; write → read → write is byte-identical with the same outcome', () => {
    const text = serialize(doc()), back = parseBpmn(text).doc!;
    expect(text).toContain(`<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" language="${FEEL_URI}">industry = "AERO"`);
    expect(serialize(back)).toBe(text);
    expect(scopeRules(back.root, { industry: 'AUTO' }).ruledOut).toEqual(scopeRules(doc().root, { industry: 'AUTO' }).ruledOut);
    expect(hasScopeRules(setCondition(doc(), 'F1', null).root)).toBe(false);
  });
  it.runIf(schemaTestsRun())('the export validates (OMG XSDs + ac: + profile)', () => {
    expect(validateText(serialize(exportDocument(caseOf(doc()))), 'rules.bpmn')).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});
