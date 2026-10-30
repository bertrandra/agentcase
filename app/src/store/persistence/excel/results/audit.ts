/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { auditReport, hasAudit, type AuditReport } from '@/domain/audit';
import { auditEvidence, evidenceRows, EVIDENCE_LEDGER_HEADERS, type AuditDriverEvidence } from '@/domain/model/auditEvidence';
import type { EvalDate } from '@/domain/model/evidenceTiers';
import type { XDocument } from '@/domain/process';
import { head } from './style';

/**
 * The audit of a case for the results workbook, or null when it holds none (the workbook then stays the legacy one, sheet for sheet). Its evidence
 * ledger block is evaluated on the export day, like the Defend section on the day it is open.
 */
export interface ResultsAudit extends AuditReport { evidence: AuditDriverEvidence[] }
export const resultsAudit = (d: XDocument | undefined, now: EvalDate): ResultsAudit | null =>
  (d && hasAudit(d) ? { ...auditReport(d, 50), evidence: auditEvidence(d, now) } : null);

const pct = (x: number | null): number | string => (x === null ? '' : Math.round(x * 1000) / 10);

/**
 * "Audit" and "Tooling" sheets (docs/SPEC_BPMN.md F-B34): coverage, observed versus modelled and the calibration log; the tooling map and the
 * tools in use per activity. Written only when the case holds audit data. The workbook says it contains audit data (F-B35).
 */
export function auditResultSheets(wb: Workbook, a: ResultsAudit | null): void {
  if (!a) return;
  const ws = wb.addWorksheet('Audit');
  ws.addRow(['Activity', 'Name', 'Modelled effort', 'Observed h/month', 'Rework observed %', 'Automation', 'Implied authority', 'Modelled authority']);
  for (const o of a.observed) {
    ws.addRow([o.id, o.name, o.effort, o.hoursPerMonth ?? '', pct(o.reworkRate), o.automation ?? '', o.impliedAuthority ?? '', o.aiAuthority]);
  }
  head(ws);
  ws.addRow([]);
  ws.addRow(['Contains audit data', a.header?.code ?? '', a.header?.status ?? '', a.header?.asOf ?? '']).font = { bold: true };
  ws.addRow(['Coverage', `${a.coverage.audited}/${a.coverage.inScope} activities`, `${pct(a.coverage.share)} %`, `${pct(a.coverage.byEffort)} % of effort`]);
  ws.addRow([]);
  ws.addRow(['Calibration', 'Date', 'Source', 'Element', 'Parameter', 'Before', 'After', 'Formula']).font = { bold: true };
  for (const k of a.calibrations) for (const x of k.changes) ws.addRow([k.code, k.date, k.source ?? '', x.element, x.param, x.from, x.to, x.formula]);
  ws.addRow([]);
  ws.addRow([...EVIDENCE_LEDGER_HEADERS]).font = { bold: true };
  for (const r of evidenceRows(a.evidence)) ws.addRow(r);
  const t = wb.addWorksheet('Tooling');
  t.addRow(['Capability', 'In-scope activities', 'Audited', 'Tools in use', 'Gap', 'Overlap']);
  for (const r of a.tooling) t.addRow([r.capability, r.activities, r.audited, r.tools.join(', '), r.gap ? 'Yes' : 'No', r.overlap ? 'Yes' : 'No']);
  head(t);
  t.addRow([]);
  t.addRow(['Activity', 'Name', 'Capability', 'Tool', 'Tool name', 'AI features', 'Integration']).font = { bold: true };
  for (const r of a.tools) t.addRow([r.activity, r.name, r.capability, r.tool, r.toolName, r.aiFeatures, r.integration]);
}
