import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { activityAudits, calibrate, coverage, editElementAudit, proposals, readAudit, toolingMap, type ElementOp, type Proposal } from '@/domain/audit';
import { loopExternalReworkEffort } from '@/domain/model/loops';
import { cmTierSplit } from '@/domain/pdc/commercial';
import { serialize, setScope, type XDocument } from '@/domain/process';
import { phaseScope } from '@/domain/scope';
import { adding, custom, emptied, opened, withDoc } from '../../helpers/processCases';

/**
 * Phase B7 gate (docs/SPEC_BPMN.md F-B28, F-B29, D-B11): the audit never moves a figure on its own; calibration proposes parameters with their
 * formula, applies only the accepted ones and logs them. Reference case: golden with every catalogue activity out of scope and the lifecycle
 * weighting off (w = effort), two custom activities C001 (Dev, effort 7, 40 % agent, Copilot) and C002 (effort 3, 90 % agent, Autonomous).
 */
const golden = opened('golden');
const two = (d: XDocument) => adding(emptied(d), custom('C001', { aiAuth: 'Copilot' }), custom('C002', { effort: 3, agentSup: 90, humanSup: 10,
  aiAuth: 'Autonomous' }));
const ref = (d: XDocument, patch: Partial<CaseState> = { lifecycleUse: false }): CaseState => withDoc(golden, d, patch);
const obs = (name: string, value: string, per?: 'month'): ElementOp => ({ kind: 'observation', obs: { name, value, ...(per ? { per } : {}) } });
const audit = (d: XDocument, rows: [string, ElementOp][]) => rows.reduce((x, [id, op]) => editElementAudit(x, id, op), d);
const sc = (s: CaseState) => phaseScope(makeCtx(s).a, s);
// C001: 2 h/item × 10 items/month = 20 h/month; C002: 0.5 h/item × 20 items/month = 10 h/month; k = (7 + 3) / (20 + 10) = 1/3
const hours = (d: XDocument) => audit(d, [['C001', obs('effortPerItem', '2')], ['C001', obs('itemsPerPeriod', '10', 'month')],
  ['C002', obs('effortPerItem', '0.5')], ['C002', obs('itemsPerPeriod', '20', 'month')]]);
const pick = (ps: Proposal[], el: string, param: string) => ps.filter((p) => p.element === el && p.param === param);

describe('without calibration no figure moves (D-B11)', () => {
  it('a full audit of the reference case leaves every scope figure identical', () => {
    const before = ref(two(golden.BPMN)), after = ref(audit(hours(two(golden.BPMN)), [['C001', obs('automationLevel', 'agentic')],
      ['C001', obs('reworkRate', '50')]]));
    expect(sc(after)).toEqual(sc(before));
    expect(cmTierSplit(makeCtx(after))).toEqual(cmTierSplit(makeCtx(before)));
  });
});

describe('proposals (F-B28, F-B29): observed versus modelled, with the formula', () => {
  it('effort: hours per month × k, k = Σ effort / Σ hours = 10 / 30; C001 → 6.67, C002 → 3.33', () => {
    const d = hours(two(golden.BPMN)), rows = activityAudits(d);
    expect(rows.find((r) => r.id === 'C001')?.hoursPerMonth).toBe(20);
    expect(rows.find((r) => r.id === 'C002')?.hoursPerMonth).toBe(10);
    const ps = proposals(d);
    expect(pick(ps, 'C001', 'effort').map((p) => [p.from, p.to])).toEqual([['7', '6.67']]);
    expect(pick(ps, 'C002', 'effort').map((p) => [p.from, p.to])).toEqual([['3', '3.33']]);
    expect(pick(ps, 'C001', 'effort')[0]!.formula).toContain('k 0.3333');
    expect(coverage(rows)).toMatchObject({ inScope: 2, audited: 2, share: 1, byEffort: 1 });
  });
  it('one activity with hours is not enough for a scale (k would be its own ratio): no effort proposal', () => {
    const d = audit(two(golden.BPMN), [['C001', obs('effortPerItem', '2')], ['C001', obs('itemsPerPeriod', '10', 'month')]]);
    expect(proposals(d).filter((p) => p.param === 'effort')).toEqual([]);
  });
  it('AI authority from the automation level; never for a regulatory activity', () => {
    const d = audit(two(golden.BPMN), [['C001', obs('automationLevel', 'pipeline')], ['C002', obs('automationLevel', 'agentic')]]);
    expect(proposals(d).map((p) => [p.element, p.param, p.from, p.to])).toEqual([['C001', 'aiAuthority', 'Copilot', 'Supervised autonomous']]);
  });
});

describe('calibration: accepted changes only, one step, logged (hand-computed figures)', () => {
  it('effort of C001 only: selected weight 7 + 3 = 10 → 6.67 + 3 = 9.67; agent share (6.67 × 40 + 3 × 90) / 9.67', () => {
    const d = hours(two(golden.BPMN)), c001 = pick(proposals(d), 'C001', 'effort');
    const after = calibrate(d, c001, '2026-10-30', 'Interviews of October'), s = ref(after);
    expect(sc(s).selW).toBeCloseTo(9.67, 12);
    expect(sc(s).avgAgent).toBeCloseTo((6.67 * 40 + 3 * 90) / 9.67, 0);
    const log = readAudit(after).header!.calibrations;
    expect(log).toEqual([{ code: 'CAL-1', date: '2026-10-30', source: 'Interviews of October',
      changes: [{ element: 'C001', param: 'effort', from: '7', to: '6.67', formula: c001[0]!.formula }] }]);
  });
  it('AI authority: tiers 0.7 Copilot / 0.3 Autonomous → C001 Supervised autonomous: [0, 0.7, 0.3]', () => {
    const d = audit(two(golden.BPMN), [['C001', obs('automationLevel', 'pipeline')]]), s0 = ref(d), s = ref(calibrate(d, proposals(d), '2026-10-30', ''));
    expect(cmTierSplit(makeCtx(s0))).toEqual({ t0: 0.7, t1: 0, t2: 0.3 });
    expect(cmTierSplit(makeCtx(s))).toEqual({ t0: 0, t1: 0.7, t2: 0.3 });
  });
  it('rework probability of LP001 from the rework rate of A017 (20 %): 10 × 0.1 × 0.4 = 0.4 w → 10 × 0.2 × 0.4 = 0.8 w', () => {
    const apply = { dom: { ...golden.dom, checked: { ...golden.dom.checked, loopExternalApply: true } }, lifecycleUse: false };
    const base = adding(emptied(golden.BPMN), custom('C002', { phase: 'V4', effort: 10 }));
    expect(pick(proposals(audit(base, [['A017', obs('reworkRate', '20')]])), 'LP001', 'probability')).toEqual([]);   // A017 out of scope: none
    const d = audit(setScope(base, ['A017'], true), [['A017', obs('reworkRate', '20')]]), lp = pick(proposals(d), 'LP001', 'probability');
    expect(lp.map((p) => [p.from, p.to, p.formula])).toEqual([['0.1', '0.2', 'observed rework rate 20 % / 100']]);
    const lp001 = (x: XDocument) => loopExternalReworkEffort(makeCtx(ref(x, apply))).find((l) => l.id === 'LP001')!.rawAddedW;
    expect(lp001(d)).toBeCloseTo(0.4, 12);
    expect(lp001(calibrate(d, lp, '2026-10-30', ''))).toBeCloseTo(0.8, 12);
  });
  it('nothing accepted, or a refused value: the same document (no step); undo of a calibration is the document before', () => {
    const d = hours(two(golden.BPMN));
    expect(calibrate(d, [], '2026-10-30', '')).toBe(d);
    expect(calibrate(d, [{ element: 'C001', param: 'effort', from: '7', to: '-1', formula: '' }], '2026-10-30', '')).toBe(d);
    expect(calibrate(d, pick(proposals(d), 'C001', 'effort'), 'not a date', '')).toBe(d);
    const twice = calibrate(calibrate(d, pick(proposals(d), 'C001', 'effort'), '2026-10-30', ''), [{ element: 'C002', param: 'effort', from: '3', to: '4',
      formula: 'manual' }], '2026-10-31', '');
    expect(readAudit(twice).header!.calibrations.map((c) => c.code)).toEqual(['CAL-1', 'CAL-2']);
    expect(serialize(d)).toBe(serialize(hours(two(golden.BPMN))));
  });
  it('tooling map: a gap where no tool in use serves the capability, an overlap where several do', () => {
    const d = audit(two(golden.BPMN), [['C001', { kind: 'tool', use: { ref: 'github-copilot' } }], ['C001', { kind: 'tool', use: { ref: 'cursor' } }]]);
    expect(toolingMap(d).map((r) => [r.capability, r.tools, r.gap, r.overlap])).toEqual([['Coding', ['github-copilot', 'cursor'], false, true]]);
    expect(toolingMap(two(golden.BPMN)).map((r) => [r.capability, r.gap])).toEqual([['Coding', true]]);
  });
});
