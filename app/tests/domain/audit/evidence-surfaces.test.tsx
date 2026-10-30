// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { editElementAudit, type ElementOp } from '@/domain/audit';
import { auditEvidence, evidenceRows, evidenceScore, EVIDENCE_LEDGER_HEADERS } from '@/domain/model/auditEvidence';
import { evlModel } from '@/domain/model/evidence';
import { evalDay } from '@/domain/model/evidenceTiers';
import type { XDocument } from '@/domain/process';
import { THEME_DEFAULT } from '@/domain/theme';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData } from '@/store/persistence/excel/results';
import { esc } from '@/store/persistence/report/render';
import { buildAuditReport } from '@/store/persistence/report/audit';
import { DriverTable } from '@/ui/sections/model-engine/evidence/DriverTable';
import { adding, custom, emptied, opened, withDoc } from '../../helpers/processCases';

/**
 * D-B33 across surfaces: the audited evidence of each driver is computed once (`auditEvidence`) and the Defend section (evidence ledger), the audit
 * report (section 6) and the results workbook (Audit sheet) print that value, at the same evaluation date.
 */
afterEach(cleanup);
const DAY = new Date(2026, 9, 30, 12), NOW = evalDay(DAY);
const high = { source: 'measurement' as const, date: '2026-09-01', confidence: 'high' as const };
const ob = (name: string, value: string, more: object): ElementOp => ({ kind: 'observation', obs: { name, value, ...high, ...more } });
const golden = opened('golden');
const doc: XDocument = [['C001', ob('firstPassYield', '80', {})], ['C001', ob('fteShare', '30', { role: 'role-dev' })],
  ['C002', ob('reworkRate', '10', { confidence: 'medium' })]].reduce((x, [id, op]) => editElementAudit(x, id as string, op as ElementOp),
  adding(emptied(golden.BPMN), custom('C001'), custom('C002', { effort: 3 })));
const s = withDoc(golden, doc), c = makeCtx(s), owner = auditEvidence(doc, NOW);

describe('the audited evidence is the same on every surface', () => {
  it('owner: p (7 × 1 + 3 × 0.6) / 10 = 0.88 BENCHMARK; supCapacity (7 × 1 + 3 × 0.25) / 10 = 0.775 BENCHMARK', () => {
    expect(evidenceRows(owner)).toEqual([['Acceptance rate (P1)', 'firstPassYield, reworkRate', 'BENCHMARK', 0.88, '2/2', 2],
      ['Supervising capacity (P3)', 'fteShare', 'BENCHMARK', 0.775, '1/2', 1]]);
  });
  it('Defend section: each driver row carries the owner value and shows it', () => {
    const em = evlModel(c, null, NOW);
    expect(em.drivers.filter((d) => d.audit).map((d) => d.audit)).toEqual(owner);
    const { container } = render(<DriverTable em={em} />);
    for (const a of owner) expect(container.textContent).toContain(`audited ${a.tier} · score ${evidenceScore(a)} · ${a.activities}/${a.inScope} activities`);
  });
  it('audit report section 6 prints the owner rows', () => {
    const html = buildAuditReport(doc, THEME_DEFAULT, 'Acme', DAY).html;
    expect(html).toContain('<h2>6 · Evidence ledger</h2>');
    for (const r of evidenceRows(owner)) expect(html).toContain(`<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`);
  });
  it('results workbook Audit sheet prints the owner rows', async () => {
    const wb = buildResultsWorkbook(await loadExcelJS(), resultsData(c, undefined, NOW), THEME_DEFAULT), rows: unknown[][] = [];
    wb.getWorksheet('Audit')!.eachRow((r) => rows.push((r.values as unknown[]).slice(1)));
    const at = rows.findIndex((r) => r[0] === EVIDENCE_LEDGER_HEADERS[0]);
    expect(rows[at]).toEqual([...EVIDENCE_LEDGER_HEADERS]);
    expect(rows.slice(at + 1)).toEqual(evidenceRows(owner));
  });
});
