import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  caseCopy, editCatalog, editElementAudit, effectiveCatalog, exportAuditDoc, hasAudit, proposedTools, readAudit, setAuditHeader, SHIPPED_AS_OF,
  SHIPPED_REVIEW, SHIPPED_TOOLS, shippedTool, VERIFICATIONS, withoutAudit,
} from '@/domain/audit';
import { catalogueProcess, serialize } from '@/domain/process';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';
import { AUDITED, auditedDoc } from '../../helpers/auditCases';

/** Phase B7 (docs/SPEC_BPMN.md § 15.3–15.5): the audit is written in the case's BPMN document, read back, filtered from exports, and valid. */
const base = catalogueProcess();
const sameTree = (d: typeof base) => { const r = parseBpmn(serialize(d)); expect(r.errors).toEqual([]); expect(r.doc).toStrictEqual(d); };

describe('audit elements (ac:audit, ac:auditHeader, ac:toolCatalog)', () => {
  it('observations, tools, pain points and evidence read back as written; the text reads back as the same tree', () => {
    const d = auditedDoc(base), a = readAudit(d).elements.get('A017')!;
    expect(a.tools.map((t) => t.ref)).toEqual(['github-copilot', 'vscode']);
    expect(a.observations.find((o) => o.name === 'effortPerItem' && o.role === 'role-dev')).toEqual(
      { name: 'effortPerItem', value: '6', unit: 'person-hours', role: 'role-dev', source: 'interview', date: '2026-10-20', confidence: 'medium' });
    expect(a.painPoints).toEqual([{ text: 'Specs arrive late', severity: 4, aiCandidate: 'yes' }]);
    expect(readAudit(d).header).toMatchObject({ code: 'AUD-7', client: 'Acme', status: 'inProgress', asOf: '2026-10-20' });
    expect(readAudit(d).elements.get('role-dev')!.observations[0]!.name).toBe('workload');
    expect(hasAudit(d)).toBe(true);
    sameTree(d);
  });
  it('refusals leave the same document: unknown element, value outside its field, unknown role, per-role on a field without it, bad date', () => {
    const d = auditedDoc(base), obs = (o: object) => ({ kind: 'observation' as const, obs: { name: 'reworkRate', value: '10', ...o } });
    expect(editElementAudit(d, 'nope', obs({}))).toBe(d);
    expect(editElementAudit(d, 'A017', obs({ value: '140' }))).toBe(d);
    expect(editElementAudit(d, 'A017', obs({ role: 'role-ghost' }))).toBe(d);
    expect(editElementAudit(d, 'A017', obs({ role: 'role-dev' }))).toBe(d);   // the rework rate is per activity only
    expect(editElementAudit(d, 'A017', obs({ date: '2026-13-01' }))).toBe(d);
    expect(editElementAudit(d, 'A017', { kind: 'tool', use: { ref: 'bad ref!' } })).toBe(d);
    expect(setAuditHeader(d, { status: 'done' as never }, '2026-10-30')).toBe(d);
  });
  it('removing the last observation removes the ac:audit element: the task is back to its original tree', () => {
    let d = editElementAudit(base, 'A023', { kind: 'observation', obs: { name: 'batchSize', value: '3' } });
    expect(d).not.toBe(base);
    d = editElementAudit(d, 'A023', { kind: 'removeObservation', name: 'batchSize' });
    expect(serialize(d)).toBe(serialize(base));
  });
  it('the observations change no model parameter (D-B11): the process view is the same as before', () => {
    const d = auditedDoc(base);
    expect(serialize(withoutAudit(d))).toBe(serialize(base));
  });
});

describe('tool catalogue (F-B23–F-B26, D-B12)', () => {
  it('ships dated, sourced entries for every capability of § 15.2; proposes the tools of an activity capability, by category', () => {
    expect(SHIPPED_TOOLS.length).toBeGreaterThan(70);
    expect(SHIPPED_TOOLS.every((t) => t.source?.startsWith('https://') && t.asOf && t.capabilities.length)).toBe(true);
    expect(new Set(SHIPPED_TOOLS.map((t) => t.code)).size).toBe(SHIPPED_TOOLS.length);
    const caps = new Set(SHIPPED_TOOLS.flatMap((t) => t.capabilities));
    for (const c of ['Planning', 'Documentation', 'Knowledge', 'Analysis', 'Design', 'Coding', 'Review', 'Test', 'Security', 'Release', 'Compliance',
      'RunSupport']) expect(caps.has(c), c).toBe(true);
    const test = proposedTools(effectiveCatalog({ caseTools: [] }), 'Test');
    expect(test.every((t) => t.capabilities.includes('Test'))).toBe(true);
    expect(proposedTools(effectiveCatalog({ caseTools: [] }), 'Run / support').map((t) => t.code)).toContain('pagerduty');
    expect(proposedTools(effectiveCatalog({ caseTools: [] }), 'Test', 'play').map((t) => t.code)).toEqual(['playwright']);
  });
  it('is verified against public sources, the owner sign-off pending: each entry dated and checked, alphabetical within its category', () => {
    expect(SHIPPED_REVIEW).toMatch(/^Verified \d{4}-\d{2}-\d{2} against public sources; owner sign-off pending/);
    expect(SHIPPED_REVIEW).not.toMatch(/DRAFT|needs the owner|approved/);
    for (const t of SHIPPED_TOOLS) {
      expect(VERIFICATIONS, t.code).toContain(t.verification);
      expect(t.asOf! <= SHIPPED_AS_OF && /^\d{4}-\d{2}-\d{2}$/.test(t.asOf!), t.code).toBe(true);
      if (t.verification !== 'verified') expect(t.note, t.code).toBeTruthy();
    }
    const cats = SHIPPED_TOOLS.map((t) => t.category).filter((c, i, all) => i === 0 || all[i - 1] !== c);
    expect(new Set(cats).size).toBe(cats.length);   // one block per category, never interleaved
    for (const c of cats) {
      const names = SHIPPED_TOOLS.filter((t) => t.category === c).map((t) => t.name);
      expect(names, c).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    }
    const copy = caseCopy(shippedTool('jira')!);   // the case's copy drops what the XSD has no attribute for
    expect([copy.source, copy.verification, copy.note]).toEqual([undefined, undefined, undefined]);
    expect(shippedTool('opsgenie')).toBeUndefined();   // end of sale 2025-06-04: removed in the 2026-10-31 check
  });
  it('a client-specific tool is kept in the case and offered for its capability; a retired shipped tool is not proposed; removal empties it', () => {
    const tool = { code: 'bench', name: 'In-house bench', capabilities: ['Test'], licence: [], aiFeatures: [], integration: ['manual'], hosting: [],
      clientSpecific: true, retired: false };
    let d = editCatalog(base, { kind: 'upsert', tool });
    d = editCatalog(d, { kind: 'retire', code: 'selenium', retired: true });
    const cat = effectiveCatalog(readAudit(d)), codes = proposedTools(cat, 'Test').map((t) => t.code);
    expect(codes).toContain('bench');
    expect(codes).not.toContain('selenium');
    expect(readAudit(d).caseTools.map((t) => t.code)).toEqual(['bench', 'selenium']);
    sameTree(d);
    expect(editCatalog(d, { kind: 'upsert', tool: { ...tool, capabilities: ['two words'] } })).toBe(d);
    d = editCatalog(editCatalog(d, { kind: 'remove', code: 'bench' }), { kind: 'remove', code: 'selenium' });
    expect(serialize(d)).toBe(serialize(base));
  });
});

describe('BPMN export: audit opt-in (F-B33, F-B35, D-B14)', () => {
  it('without the option the file has no audit element; a document without audit is returned as it is', () => {
    const d = auditedDoc(base), out = serialize(exportAuditDoc(d, false));
    for (const tag of ['ac:audit', 'ac:auditHeader', 'ac:toolCatalog', 'containsAudit']) expect(out).not.toContain(tag);
    expect(exportAuditDoc(base, false)).toBe(base);
  });
  it('with the option the file says so and carries the shipped entries it uses', () => {
    const out = exportAuditDoc(auditedDoc(base), true), a = readAudit(out);
    expect(serialize(out)).toContain('containsAudit="true"');
    expect(a.caseTools.map((t) => t.code).sort()).toEqual(['github-copilot', 'vscode']);
    expect(readAudit(out).elements.size).toBe(AUDITED.length);
  });
});

describe.skipIf(!schemaTestsRun())('the audit validates (xmllint: OMG XSDs + ac: + profile)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b7-audit-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it('a document with header, catalogue, observations per activity and role, and its exports with and without audit', () => {
    const files = [['audited', auditedDoc(base)], ['with', exportAuditDoc(auditedDoc(base), true)], ['without', exportAuditDoc(auditedDoc(base), false)]]
      .map(([n, d]) => { const f = join(dir, `${n as string}.bpmn`); writeFileSync(f, serialize(d as typeof base)); return f; });
    expect(validate(files).results.map((r) => [r.schema, r.errors, r.warnings])).toEqual(files.map(() => ['valid', [], []]));
  }, 60000);
});
