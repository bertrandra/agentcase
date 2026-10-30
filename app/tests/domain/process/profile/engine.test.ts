import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { caseLoopPairs, readProcess, serialize, type XDocument } from '@/domain/process';
import { withExt } from '@/domain/process/editTree';
import { taskOf } from '@/domain/process/buildTasks';
import {
  addCall, addCompensation, addEventSub, addGlobalTask, addInside, clearLoop, effortFactors, readLoops, setBoundedLoop, setMultiInstance,
} from '@/domain/process/profile';
import { editDoc } from '@/domain/process/profile/tree';
import { withAttrs, type XElement } from '@/domain/process/xml';
import { phaseScope } from '@/domain/scope';
import { adding, custom, emptied, opened, withBoundary, withDoc } from '../../../helpers/processCases';

/**
 * Phase B5b gate: the extended-profile elements that feed the engine move the figures by the amounts computed by hand (docs/SPEC_BPMN.md
 * F-B44, F-B46, F-B49, F-B50, F-B52, F-B53; D-B21, D-B23). Reference case as in B5: the golden fixture with every catalogue activity out of
 * scope and the lifecycle weighting off (w = effort), so the scope weight `selW` is the sum of the custom activities' counted effort.
 */
const golden = opened('golden');
const ref = (d: (x: XDocument) => XDocument): CaseState => withDoc(golden, d(adding(emptied(golden.BPMN), custom('C001'))), { lifecycleUse: false });
const scope = (s: CaseState) => phaseScope(makeCtx(s).a, s);
const task = (id: string, effort: number): XElement => withAttrs(taskOf(custom(id, { effort }), 900, false), { 'ac:inScope': 'true' });

describe('effort factors (one owner: profile/effort.ts)', () => {
  it('the default process has none (parity)', () => {
    expect(effortFactors(golden.BPMN.root).size).toBe(0);
    expect(readProcess(golden.BPMN).activities.some((a) => a.factor !== undefined)).toBe(false);
  });
  it('D-B21 multi-instance: effort per item 7 × 5 items = 35; removing the marker gives the lump effort back', () => {
    const s = ref((d) => setMultiInstance(d, 'C001', { items: 5, per: 'sprint' }));
    expect(scope(s).selW).toBe(35);
    expect(scope(ref((d) => clearLoop(setMultiInstance(d, 'C001', { items: 5, per: 'sprint' }), 'C001'))).selW).toBe(7);
  });
  it('F-B49 event sub-process: a task of 2 triggered 4 times counts 8, in the phase that holds it', () => {
    const s = ref((d) => addInside(addEventSub(d, { id: 'EV1', name: 'Incident', container: 'V3', trigger: { kind: 'signal' }, frequency: { count: 4,
      per: 'month' } }),
      'EV1', task('C009', 2)));
    expect(readProcess(s.BPMN).activities.find((a) => a.id === 'C009')).toMatchObject({ phase: 'V3', trigger: 'EV1', factor: 4 });
    expect(scope(s)).toMatchObject({ selW: 7 + 8, count: 2 });
  });
  it('F-B50 compensation: a rollback of effort 10 at a 20 % change-failure rate counts 2', () => {
    const s = ref((d) => addCompensation(d, { container: 'V3', activity: 'C001', handler: task('C010', 10), probability: 0.2 }));
    expect(scope(s).selW).toBeCloseTo(7 + 2, 12);
  });
  it('F-B52 call activity: counts the effort of the library entry it calls (4), or its own when it has one', () => {
    const call = (d: XDocument) => editDoc(addCall(addGlobalTask(d, { id: 'lib-review', name: 'Code review pattern', type: 'Human', effort: 4, phase: 'V3' }),
      'V3', 'C020', 'Review (library)', 'lib-review'), 'C020', (e) => withAttrs(e, { 'ac:inScope': 'true' }));
    const s = ref(call);
    expect(readProcess(s.BPMN).activities.find((a) => a.id === 'C020')).toMatchObject({ element: 'callActivity', called: 'lib-review', effort: 4 });
    expect(scope(s).selW).toBe(7 + 4);
  });
});

describe('D-B23 task types', () => {
  it('a script task brings no AI saving: its agent share is 0 in the figures, (7 × 0 + 3 × 90) / 10 = 27 instead of 55', () => {
    const s = ref((d) => adding(d, custom('C002', { effort: 3, agentSup: 90, humanSup: 10 })));
    const script = withDoc(s, editDoc(s.BPMN, 'C001', (e) => withExt({ ...e, local: 'scriptTask' }, 'activity', { type: 'Script' })));
    expect(scope(s).avgAgent).toBe(55);
    expect(scope(script)).toMatchObject({ avgAgent: 27, selW: 10 });
  });
  it('an activity of type Script (written as a scriptTask) keeps its effort and loses its agent share', () => {
    const s = ref((d) => adding(d, custom('C002', { effort: 3, agentSup: 90, humanSup: 10, agentActivityType: 'Script' })));
    expect(readProcess(s.BPMN).activities.find((a) => a.id === 'C002')).toMatchObject({ element: 'scriptTask', type: 'Script' });
    expect(scope(s)).toMatchObject({ selW: 10, avgAgent: Math.round((7 * 40 + 3 * 0) / 10) });
  });
});

describe('F-B46 bounded loops', () => {
  it('a rework loop without internal iterations takes the loopMaximum of its agent activity', () => {
    const base = (d: XDocument) => withBoundary(adding(d, custom('C002')), { id: 'BE2', container: 'V3', on: 'C001', to: 'C002', p: 0.1, share: 0.2 });
    expect(caseLoopPairs(ref(base)).find((l) => l.id === 'BE2')?.internalIter).toBe(0);
    const s = ref((d) => setBoundedLoop(base(d), 'C001', 3));
    expect(caseLoopPairs(s).find((l) => l.id === 'BE2')?.internalIter).toBe(3);
    expect(caseLoopPairs(s).find((l) => l.id === 'LP002')?.internalIter).toBe(caseLoopPairs(golden).find((l) => l.id === 'LP002')?.internalIter);
  });
  it('the loop is standard BPMN on the task (loopMaximum, testBefore)', () => {
    const d = setBoundedLoop(adding(emptied(golden.BPMN), custom('C001')), 'C001', 3, true);
    expect(readLoops(d.root).bounded.get('C001')).toEqual({ activity: 'C001', max: 3, testBefore: true });
    expect(serialize(d)).toContain('<bpmn:standardLoopCharacteristics id="C001_loop" testBefore="true" loopMaximum="3"/>');
  });
});
