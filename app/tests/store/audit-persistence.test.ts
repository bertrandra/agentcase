import { withoutTeams } from '@/domain/org';
import { describe, expect, it } from 'vitest';
import { applyAuditImport, editAudit, setHeader } from '@/controllers/audit';
import { auditReportFile, auditTemplate, importAuditWorkbook } from '@/controllers/auditFiles';
import { exportProcessFiles } from '@/controllers/bpmn';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { readAudit } from '@/domain/audit';
import { serialize } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { AUDIT_OPS } from '../helpers/auditCases';
import { expectAutosaveRestores, expectTabSync } from '../helpers/docRoundTrips';
import { freshStore } from './helpers';

/**
 * Phase B7 gate: the audit lives in the case's BPMN document and travels with it — save / open, autosave with its undo history, tab sync, the
 * HTML snapshot (only when asked, F-B35), the BPMN export (only with "include audit data", D-B14), the audit workbook (out and back in).
 */
const NOW = new Date('2026-10-30T12:00:00Z');
const edit = () => {
  const interviews = [{ code: 'INT-1', role: 'Dev lead', date: '2026-10-15' }];
  expect(setHeader({ code: 'AUD-7', client: 'Acme', status: 'inProgress', interviews }, NOW)).toBe(true);
  for (const [id, op] of AUDIT_OPS) expect(editAudit(id, op), `${id} ${op.kind}`).toBe(true);
};
const bpmnOf = (s: AppStore) => s.getState().portfolio.common.BPMN;
const lastPatch = (s: AppStore) => JSON.stringify(s.getState().history.undo.at(-1)?.patches ?? []);
const page = () => new DOMParser().parseFromString('<!doctype html><html><head><title>A</title></head><body><div id="root"></div></body></html>', 'text/html');

describe('commands: node-level undo patches, never the document', () => {
  it('an observation is a small patch; a refused value adds no step; undo restores the exact tree', () => {
    const s = freshStore(), before = serialize(bpmnOf(s));
    edit();
    expect(lastPatch(s).length).toBeLessThan(3_000);
    expect(lastPatch(s)).not.toContain('"kind":"document"');
    const steps = s.getState().history.undo.length;
    expect(editAudit('A017', { kind: 'observation', obs: { name: 'reworkRate', value: '250' } })).toBe(false);
    expect(s.getState().history.undo.length).toBe(steps);
    while (s.undo());
    expect(serialize(bpmnOf(s))).toBe(before);
  });
});

describe('persistence round trips with audit data', () => {
  it('save -> open: same document and audit', () => {
    const s = freshStore(); edit();
    const saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(s.getState().portfolio, () => new Date(0)))) as Record<string, unknown>;
    expect(saved.BPMN).toContain('<ac:auditHeader code="AUD-7"');
    expect(openChecked(saved).portfolio.common.BPMN).toStrictEqual(bpmnOf(s));
  });
  it('autosave: the record restores the audit and its undo history', () => expectAutosaveRestores(edit));
  it('tab sync: the other tab receives the audit as patches', () => expectTabSync(edit));
  it('HTML snapshot: the audit is left out by default, embedded when asked (and the file name says so)', () => {
    const s = freshStore(); edit();
    const read = (html: string) => readEmbeddedCase(new DOMParser().parseFromString(html, 'text/html'))!.doc.BPMN;
    const off = htmlSnapshotFile(page().documentElement, new Date(0)), on = htmlSnapshotFile(page().documentElement, new Date(0), true);
    expect(readAudit(read(off.html)).elements.size).toBe(0);
    expect(read(on.html)).toStrictEqual(withoutTeams(bpmnOf(s)));   // the embedded case: its team as `teamIn` (schema v5)
    expect([off.filename.includes('audit'), on.filename.includes('contains_audit_data')]).toEqual([false, true]);
  });
  it('BPMN export: without audit by default; with it, re-imported as the same audit', () => {
    const s = freshStore(); edit();
    const [plain] = exportProcessFiles('shown', false, NOW), [full] = exportProcessFiles('shown', false, NOW, true);
    expect(plain!.text).not.toContain('ac:audit');
    expect(full!.filename).toContain('contains_audit_data');
    const back = parseBpmn(full!.text, full!.text.length).doc!;
    expect(readAudit(back).elements).toStrictEqual(readAudit(bpmnOf(s)).elements);
    expect(readAudit(back).header).toStrictEqual(readAudit(bpmnOf(s)).header);
  });
  it('audit workbook: export then import into a fresh case gives the same observations, tools, pain points and evidence', async () => {
    const s = freshStore(); edit();
    const before = readAudit(bpmnOf(s)).elements, b = await (await auditTemplate(NOW)).blob.arrayBuffer();
    expect(auditReportFile(NOW).html).toContain('Contains audit data');
    const t = freshStore();
    const r = await importAuditWorkbook({ name: 'audit.xlsx', size: b.byteLength, arrayBuffer: async () => b });
    expect([r.ignored, r.notes]).toEqual([0, []]);
    const after = readAudit(bpmnOf(t)), sorted = (id: string, m: typeof before) => [...(m.get(id)?.observations ?? [])]
      .sort((x, y) => `${x.name}${x.role}`.localeCompare(`${y.name}${y.role}`));
    for (const id of ['A017', 'A023']) expect(sorted(id, after.elements)).toEqual(sorted(id, before));
    expect(after.elements.get('A017')?.tools.map((t) => t.ref)).toEqual(before.get('A017')?.tools.map((t) => t.ref));
    expect(after.elements.get('A017')?.painPoints).toEqual(before.get('A017')?.painPoints);
    expect(after.elements.get('A017')?.evidence).toEqual(before.get('A017')?.evidence);
    expect(t.getState().history.undo.map((h) => h.type)).toEqual(['audit.importWorkbook']);
    expect(applyAuditImport([])).toBe(false);
  });
});
