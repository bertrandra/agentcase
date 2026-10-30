import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { collaborationAudit, exportAuditDoc, readAudit } from '@/domain/audit';
import { resolveProduct } from '@/domain/portfolio';
import { collaborationDocument, collaborationText, exportCaseText, serialize } from '@/domain/process';
import { auditedDoc } from '../../helpers/auditCases';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';
import { openPortfolioFixture } from '../../helpers/portfolioFixtures';

/**
 * Phase B7 (F-B30, F-B33): a portfolio whose common process holds the audit exports one file per product and one collaboration file, with or
 * without the audit; with it, the per-role observations follow the product's id prefix and the collaboration carries the header and catalogue.
 * Without it, the files are byte-identical to those of the portfolio without audit data.
 */
const pf = openPortfolioFixture('pf-three-products'), plain = pf.products.map((p, i) => ({ code: `P${i + 1}`, name: p.name, case: resolveProduct(pf, p.id) }));
const audited = { ...pf, common: { ...pf.common, BPMN: auditedDoc(pf.common.BPMN) } };
const items = audited.products.map((p, i) => ({ code: `P${i + 1}`, name: p.name, case: resolveProduct(audited, p.id) }));
const marked = (include: boolean) => items.map((p) => ({ ...p, case: { ...p.case, BPMN: exportAuditDoc(p.case.BPMN, include) } }));
const collab = () => collaborationAudit(collaborationDocument(marked(true)), items.map((p) => ({ code: p.code, doc: p.case.BPMN })));

describe('portfolio exports with the audit opt-in', () => {
  it('without the option: byte-identical to the portfolio without audit data (per product and collaboration)', () => {
    expect(marked(false).map((p) => exportCaseText(p.case, { product: p }))).toEqual(plain.map((p) => exportCaseText(p.case, { product: p })));
    expect(collaborationText(marked(false))).toBe(collaborationText(plain));
  });
  it('the collaboration file with audit: header, catalogue, observations with the per-role split prefixed by the product code', () => {
    const d = collab(), a = readAudit(d), owned = items.filter((p) => readAudit(p.case.BPMN).elements.size > 0);
    expect(a.header?.code).toBe('AUD-7');
    expect(a.caseTools.map((t) => t.code).sort()).toEqual(['github-copilot', 'vscode']);
    expect(owned.length).toBeGreaterThan(0);
    expect(a.elements.get('P1_A017')?.observations.find((o) => o.role)?.role).toBe('P1_role-dev');
  });
});

describe.skipIf(!schemaTestsRun())('portfolio exports with audit validate (xmllint)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b7-pf-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it('one file per product and the collaboration file, with audit data: 0 error, 0 warning', () => {
    const texts = [...marked(true).map((p) => exportCaseText(p.case, { product: p })), serialize(collab())];
    const files = texts.map((t, i) => { const f = join(dir, `pf-${i}.bpmn`); writeFileSync(f, t); return f; });
    expect(validate(files).results.map((r) => [r.schema, r.errors, r.warnings])).toEqual(files.map(() => ['valid', [], []]));
  }, 120000);
});
