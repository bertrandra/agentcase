import { describe, expect, it } from 'vitest';
import { byActivity, byProduct, byRole, byTeam, byUnit, countBySeverity, orgDiagnostics, orgOf, raciDiagnostics, setRaci, unstaffed,
  type ActivityRaci } from '@/domain/org';
import { addSharedLine, setSharedAllocation } from '@/domain/portfolio';
import { catalogueProcess } from '@/domain/process';
import { goldenAndB, SHARED_LINE } from '../../helpers/portfolio';

/** F-B36 / F-B37 (docs/SPEC_BPMN.md § 16.2) and the "who does what" answers of F-B38. */
const known = new Set(['role-dev', 'role-lead', 'agent-coding']);
const act = (p: Partial<ActivityRaci>): ActivityRaci => ({ id: 'X1', name: 'Code', phase: 'V3', type: 'Human', inScope: true, effort: 10, source: 'explicit',
  accountableToConfirm: false, accountables: 1, raci: { R: ['role-dev'], A: 'role-lead', C: [], I: [] }, ...p });
const codes = (a: ActivityRaci) => raciDiagnostics(a, known).map((d) => [d.code, d.severity]);

describe('F-B36: RACI rules per activity', () => {
  it('a complete RACI raises nothing', () => expect(codes(act({}))).toEqual([]));
  it('no Responsible and no agent: error', () => expect(codes(act({ raci: { R: [], A: 'role-lead', C: [], I: [] } }))).toEqual([['noResponsible', 'error']]));
  it('an agent alone is a Responsible', () => expect(codes(act({ agent: 'agent-coding', raci: { R: [], A: 'role-lead', C: [], I: [] } }))).toEqual([]));
  it('several Accountable: error', () => expect(codes(act({ accountables: 2 }))).toEqual([['severalAccountable', 'error']]));
  it('D-B18: agent activity without a human Accountable is information, not an error', () => {
    expect(codes(act({ agent: 'agent-coding', accountables: 0, raci: { R: ['role-dev'], C: [], I: [] } }))).toEqual([['noHumanAccountable', 'info']]);
  });
  it('human activity without Accountable: warning', () => {
    expect(codes(act({ accountables: 0, raci: { R: ['role-dev'], C: [], I: [] } }))).toEqual([['noAccountable', 'warning']]);
  });
  it('the default Accountable (legacy skill) is "to confirm" information', () => {
    expect(codes(act({ source: 'default', accountableToConfirm: true, accountables: 0 }))).toEqual([['accountableToConfirm', 'info']]);
  });
  it('an unknown role is named once', () => {
    expect(raciDiagnostics(act({ raci: { R: ['role-dev'], A: 'role-lead', C: ['ghost'], I: ['ghost'] } }), known).map((d) => d.ref)).toEqual(['ghost']);
  });
  it('out-of-scope activities are not checked', () => {
    const pf = goldenAndB(), m = orgOf(pf, catalogueProcess());
    const n = orgDiagnostics(m).filter((d) => d.activity).length, inScope = m.activities.filter((a) => a.inScope).length;
    expect(n).toBe(inScope);   // the default process: one "accountable to confirm" per in-scope activity, nothing else per activity
    expect(countBySeverity(orgDiagnostics(m)).error).toBe(0);
  });
});

describe('F-B37: every Responsible role staffed by a team serving the product', () => {
  const pf = goldenAndB(), d = catalogueProcess();
  it('golden team (Analysis/PO, Dev, Test/QA): roles of other team skills are flagged per product', () => {
    const m = orgOf(pf, d), flagged = [...unstaffed(m, 'p1').keys()].map((r) => r.teamSkill);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged).not.toContain('Dev');
    expect(orgDiagnostics(m).filter((x) => x.code === 'roleNotStaffed' && x.productId === 'B').length).toBe(flagged.length);
  });
  it('a shared line of the missing skill staffs the role for the products holding a share only', () => {
    const skill = [...unstaffed(orgOf(pf, d), 'p1').keys()][0]!.teamSkill!;
    const pf2 = setSharedAllocation(addSharedLine(pf, { ...SHARED_LINE, skill, allocations: { p1: 50 } }), SHARED_LINE.id, 'p1', 50), m = orgOf(pf2, d);
    expect([...unstaffed(m, 'p1').keys()].map((r) => r.teamSkill)).not.toContain(skill);
    expect([...unstaffed(m, 'B').keys()].map((r) => r.teamSkill)).toContain(skill);
  });
  it('a shared team allocated over 100 % is a warning', () => {
    const pf2 = addSharedLine(pf, { ...SHARED_LINE, allocations: { p1: 80, B: 40 } });
    expect(orgDiagnostics(orgOf(pf2, d)).filter((x) => x.code === 'overAllocated').map((x) => x.severity)).toEqual(['warning']);
  });
});

describe('F-B38: who does what', () => {
  const pf = goldenAndB(), d = setRaci(catalogueProcess(), 'A017', { R: [], A: 'role-lead', C: ['role-qa'], I: [] }), m = orgOf(pf, d);
  it('by activity: R / A / C / I, the agent, the teams per product', () => {
    const a = byActivity(m, 'A017')!;
    expect(a.roles.A.map((r) => r.id)).toEqual(['role-lead']);
    expect(a.agent?.id).toBe('agent-coding');
    expect(a.perProduct.map((p) => p.teams.map((t) => t.team.id))).toEqual([['team-p1'], ['team-B']]);
  });
  it('by role: activities per letter and load = effort of its R activities', () => {
    const r = byRole(m, 'role-lead')!;
    expect(r.activities.A.map((a) => a.id)).toContain('A017');
    expect(byRole(m, 'role-dev')!.load).toBeCloseTo(byRole(m, 'role-dev')!.activities.R.reduce((s, a) => s + a.effort / a.raci.R.length, 0), 9);
  });
  it('by team, unit, product: the product team carries the load of the roles it provides', () => {
    const t = byTeam(m, 'team-p1')!;
    expect(t.serves.map((s) => [s.product.id, s.pct])).toEqual([['p1', 100]]);
    expect(t.roles.map((r) => r.teamSkill)).toContain('Dev');
    expect(t.load).toBeGreaterThan(0);
    expect(byUnit(m, 'unit-delivery')!.teams.map((x) => x.id)).toEqual(['team-p1', 'team-B']);
    expect(byProduct(m, 'p1')!.chart.map((c) => c.teams.map((x) => x.team.id))).toEqual([['team-p1']]);
  });
});
