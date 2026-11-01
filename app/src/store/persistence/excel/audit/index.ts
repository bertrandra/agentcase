/** @calc-zone exports */
import {
  auditSheets, CASE_SHEET, caseSheets, listColumns, readAuditWorkbook, readCaseSheets, SHIPPED_AS_OF, SHIPPED_REVIEW, type AuditImport, type Cell, type Sheets,
} from '@/domain/audit';
import type { XDocument } from '@/domain/process';
import type { ThemeValues } from '@/domain/theme';
import { loadExcelJS } from '../lazy';
import { readKnownSheets } from '../params/reader';
import { LIMITS, ParamsImportError } from '../params/safe';
import { workbookBytes } from '../params/writer';
import { withPrint } from '../print';
import { head } from '../results/style';

/**
 * The audit workbook (docs/SPEC_BPMN.md F-B32) for interviews off-line: a "Read me" sheet, one sheet per block of § 15.3 (one row per in-scope
 * activity, more for a per-role split), Tools, Pain points, Evidence, the audit Header, the Roles' audits, the tool Catalogue (FX-28, FX-29), and a
 * Lists sheet the drop-downs read (catalogue codes, enumerations).
 * Reading it back follows the parameters workbook's rule: the file is checked whole (size, zip, sheets, every row) before anything is written.
 */
const colName = (i: number): string => {
  let s = '', n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
export const AUDIT_SHEET_README = 'Read me';

export async function auditWorkbookBytes(d: XDocument, print: Readonly<ThemeValues>, customer: string): Promise<ArrayBuffer> {
  const X = await loadExcelJS(), wb = withPrint(new X.Workbook(), print), lists = listColumns(d);
  wb.creator = 'AgentCase';
  const readme = wb.addWorksheet(AUDIT_SHEET_README);
  for (const line of [['AgentCase audit workbook'], ['Customer', customer], ['Tool catalogue as of', SHIPPED_AS_OF], ['Catalogue note', SHIPPED_REVIEW],
    ['How to', 'Fill one sheet per block; every value may carry its source, date and confidence. Leave the Role column empty for the activity as a whole, '
      + 'or add a row with a role id (or name) for a per-role value. Import the file back from the 🔎 Audit section: nothing is written before '
      + 'every row is checked.'],
    ['Case sheets', 'Header: the audit header (one row per auditor and interview). Roles: observations on a role as a whole. Catalogue: the tool '
      + 'catalogue; shipped entries are read-only (set Origin to "case" to keep a change for this case).'],
    ['Confidentiality', 'Contains audit data: client information and interview notes.']]) readme.addRow(line);
  readme.getColumn(1).width = 24; readme.getColumn(2).width = 120;
  const L = wb.addWorksheet('Lists');
  lists.forEach(([name, values], i) => { L.getCell(1, i + 1).value = name; values.forEach((v, j) => { L.getCell(j + 2, i + 1).value = v; }); });
  const at = new Map(lists.map(([n], i) => [n, i]));
  for (const s of [...auditSheets(d), ...caseSheets(d, (n) => at.get(n) ?? -1)]) {
    const ws = wb.addWorksheet(s.name);
    ws.addRow(s.header);
    for (const r of s.rows) ws.addRow(r);
    head(ws);
    const last = Math.max(s.rows.length + 50, 200);
    for (const [col, li] of Object.entries(s.lists)) {
      const list = lists[li], c = colName(li);
      if (!list) continue;
      for (let r = 2; r <= last; r++) ws.getCell(r, Number(col) + 1).dataValidation = { type: 'list', allowBlank: true,
        formulae: [`Lists!$${c}$2:$${c}$${list[1].length + 1}`] };
    }
  }
  return workbookBytes(wb);
}

/** A cell as text or number: formulas give their value, dates their ISO day, rich text its text. */
function cellOf(v: unknown): Cell {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return Number.isFinite(v) ? v : '';
  if (typeof v === 'string') return v.slice(0, LIMITS.text);
  if (v && typeof v === 'object') {
    const o = v as { result?: unknown; text?: unknown; richText?: { text?: unknown }[] };
    if (o.result !== undefined) return cellOf(o.result);
    if (o.text !== undefined) return cellOf(o.text);
    if (Array.isArray(o.richText)) return o.richText.map((t) => String(t.text ?? '')).join('').slice(0, LIMITS.text);
  }
  return typeof v === 'boolean' ? String(v) : '';
}

/** Read an audit workbook against the document as it is now: the operations to apply and the report. Throws on a file that is not one. */
export async function readAuditWorkbookBytes(input: ArrayBuffer | ArrayBufferView, d: XDocument, today: string): Promise<AuditImport> {
  const known = new Set([...auditSheets(d).map((s) => s.name), ...Object.values(CASE_SHEET)]);
  const sheets = await readKnownSheets(input, (n) => known.has(n), cellOf);
  if (!sheets.size) throw new ParamsImportError('No audit sheet found (expected e.g. "Tools", "Time", "Quality and rework")');
  const r = readAuditWorkbook(d, sheets as Sheets), c = readCaseSheets(d, sheets as Sheets, today);
  return { ops: [...r.ops, ...c.ops], added: r.added + c.added, updated: r.updated + c.updated, ignored: r.ignored + c.ignored,
    unchanged: r.unchanged + c.unchanged, notes: [...r.notes, ...c.notes],
    ...(c.header ? { header: c.header } : {}), ...(c.catalog.length ? { catalog: c.catalog } : {}) };
}
