import { describe, expect, it } from 'vitest';
import { interviewContext, interviewProgress, interviewsOf, readAudit } from '@/domain/audit';
import { editElementAudit, setAuditHeader } from '@/domain/audit/edit';
import { readProcess, serialize } from '@/domain/process';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { makeDefaultDoc } from '@/store/instance';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';

/**
 * Audit activities (owner's request 2026-11-02): an audit activity (interview) targets roles and the activities they do; its context lists them
 * with what the audit holds; its progression counts the activities covered (audit closed, or evidence naming it). Round trip and XSD.
 */
const base = () => makeDefaultDoc().BPMN;
const setup = () => {
  const d0 = base(), v = readProcess(d0), role = v.actors[0]!, a = v.activities[0]!, b = v.activities[1]!;
  const d = setAuditHeader(d0, { auditors: [{ name: 'Ann' }], interviews: [{ code: 'INT-1', role: role.name, date: '2026-11-03', roles: [role.id],
    activities: [a.id, b.id], auditor: 'Ann' }, { code: 'INT-2', role: 'Ops', date: '2026-11-04' }] }, '2026-11-02');
  return { d, role, a: a.id, b: b.id };
};

describe('audit activities', () => {
  it('round trip: roles, activities, auditor and status are written and read back; the file validates', () => {
    const { d, role, a, b } = setup(), text = serialize(d), back = parseBpmn(text).doc!;
    expect(readAudit(back).header?.interviews[0]).toEqual({ code: 'INT-1', role: role.name, date: '2026-11-03', roles: [role.id], activities: [a, b],
      auditor: 'Ann' });
    if (schemaTestsRun()) expect(validateText(text, 'audit.bpmn')?.schema).toBe('valid');
  });
  it('progression: planned, in progress with one activity closed, closed with evidence naming it on the other', () => {
    const { d, a, b } = setup();
    expect(interviewProgress(d)[0]).toMatchObject({ code: 'INT-1', activities: 2, covered: 0, share: 0, status: 'planned' });
    const one = editElementAudit(d, a, { kind: 'status', status: 'closed' });
    expect(interviewProgress(one)[0]).toMatchObject({ covered: 1, share: 0.5, status: 'inProgress' });
    const two = editElementAudit(one, b, { kind: 'evidence', evidence: { name: 'Minutes', interview: 'INT-1' } });
    expect(interviewProgress(two)[0]).toMatchObject({ covered: 2, share: 1, status: 'closed' });
    expect(interviewProgress(two)[1]).toMatchObject({ code: 'INT-2', activities: 0, share: null, status: 'planned' });
  });
  it('context: the roles and the activities of the selected audit activities, with the audit facts; an auditor sees theirs and the unassigned', () => {
    const { d, role, a } = setup(), c = interviewContext(editElementAudit(d, a, { kind: 'painPoint', point: { text: 'Manual copy', severity: 3 } }),
      ['INT-1', 'NOPE']);
    expect(c.roles).toEqual([{ id: role.id, name: role.name }]);
    expect(c.activities.find((x) => x.id === a)).toMatchObject({ painPoints: ['Manual copy'], covered: false });
    expect(c.unknown).toEqual(['NOPE']);
    const all = readAudit(d).header!.interviews;
    expect(interviewsOf(all, 'Ann').map((i) => i.code)).toEqual(['INT-1', 'INT-2']);
    expect(interviewsOf(all, 'Bob').map((i) => i.code)).toEqual(['INT-2']);
  });
});
