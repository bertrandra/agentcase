import { describe, expect, it } from 'vitest';
import { editAudit } from '@/controllers/audit';
import { importProcess, readProcessFile } from '@/controllers/processImport';
import { readAudit, withAuditMarked } from '@/domain/audit';
import { DEFAULT_CHOICES, serialize } from '@/domain/process';
import { AUDIT_OPS } from '../helpers/auditCases';
import { freshStore } from './helpers';

/**
 * SPEC_FIXES FX-25: a Merge import merges the file's audit data by element id (newer date wins, a tie keeps the case's; pain points and evidence
 * added unless there); a Replace import takes the file as it is. One undoable step; undo restores the case's audit.
 */
const fileOf = (text: string) => ({ name: 'audited.bpmn', size: text.length, text: async () => text });
const obs = (name: string, value: string, date: string) => ({ kind: 'observation' as const, obs: { name, value, source: 'interview' as const, date } });

describe('Merge import: audit data', { timeout: 30_000 }, () => {
  it('newer date wins, older kept; roles merged; pain points and evidence added; undo restores', async () => {
    const a = freshStore();
    for (const [id, op] of AUDIT_OPS) editAudit(id, op);
    const text = serialize(withAuditMarked(a.getState().doc.BPMN));   // the file: audit dated 2026-10-20
    const s = freshStore();
    expect(editAudit('A017', obs('reworkRate', '5', '2026-01-01'))).toBe(true);    // older than the file's: replaced
    expect(editAudit('A023', obs('effortPerItem', '9', '2027-01-01'))).toBe(true);  // newer than the file's: kept
    const before = serialize(s.getState().doc.BPMN), r = await readProcessFile(fileOf(text));
    if (!r.ok) throw new Error(r.errors.join());
    const report = importProcess(r, { ...DEFAULT_CHOICES, mode: 'merge' })!;
    const got = readAudit(s.getState().doc.BPMN).elements, o = (id: string, n: string) => got.get(id)?.observations.find((x) => x.name === n && !x.role);
    expect(o('A017', 'reworkRate')?.value).toBe('20');
    expect(o('A023', 'effortPerItem')?.value).toBe('9');
    expect(o('role-dev', 'workload')?.value).toBe('0.9');
    expect(got.get('A017')?.painPoints.map((p) => p.text)).toEqual(['Specs arrive late']);
    expect(got.get('A017')?.tools.map((t) => t.ref).sort()).toEqual(['github-copilot', 'vscode']);
    expect(report.auditTaken).toBeGreaterThan(5);
    expect(s.getState().history.undo.at(-1)?.label).toBe('Import process audited.bpmn (merge)');
    s.undo();
    expect(serialize(s.getState().doc.BPMN)).toBe(before);
  });
  it('a file without audit data merges nothing', async () => {
    freshStore();
    const s = freshStore(), r = await readProcessFile(fileOf(serialize(s.getState().doc.BPMN)));
    if (!r.ok) throw new Error(r.errors.join());
    expect(importProcess(r, { ...DEFAULT_CHOICES, mode: 'merge' })?.auditTaken).toBe(0);
  });
});
