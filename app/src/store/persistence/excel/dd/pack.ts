/** @calc-zone exports */
import type { Workbook, Worksheet } from 'exceljs';
import type { ExcelJS } from '../lazy';
import type { ThemeValues } from '@/domain/theme';
import type { DdPackData } from './data';
import { coefSheetEdit, ddEditText, ddEvidence, ddRole, ddUseText } from './texts';
import { withPrint, xlArgb } from '../print';

const ORDER: Record<string, number> = { open: 0, requested: 1, disputed: 2, confirmed: 3, waived: 4 };
const kEuro = (v: number): string => `€${Math.round(v / 1000).toLocaleString('en-US')}K`;
const cols = (ws: Worksheet, spec: [string, number][]) => { ws.columns = spec.map(([header, width]) => ({ header, width })); };
const head = (ws: Worksheet): void => {
  ws.getRow(1).eachCell((c) => { c.font = { bold: true, color: { argb: xlArgb(ws.workbook, 'excel-head-text') } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xlArgb(ws.workbook, 'excel-head-bg') } }; c.alignment = { horizontal: 'left', wrapText: true }; });
  ws.getRow(1).height = 22;
};

/** Register: open and requested first, grouped by role. Column 1 is the machine id that makes the round trip possible. */
function register(wb: Workbook, d: DdPackData, label: (id: string) => string): void {
  const ws = wb.addWorksheet('DD_Register');
  cols(ws, [['ID (do not edit)', 22], ['Used in', 22], ['Confirming role', 26], ['Group', 30], ['Element', 34], ['Current value', 16], ['Editable in', 22], ['Class', 18],
    ['€ weight (Y3 sensitivity)', 22], ['What we need from you', 70], ['State', 14], ['Owner', 20], ['Due date', 14], ['Note', 40]]);
  const sorted = d.rows.slice().sort((a, b) => (ORDER[d.status(a.id)] as number) - (ORDER[d.status(b.id)] as number) || ddRole(a).localeCompare(ddRole(b)));
  for (const r of sorted) {
    const w = d.fresh ? d.weight(r.id) : null, s = d.state[r.id];
    ws.addRow([r.id, ddUseText(r), ddRole(r), r.g, r.l, r.v == null ? '—' : String(r.v), ddEditText(r.edit, label), r.cls || '',
      w == null ? (d.fresh ? 'not measurable' : 'not measured') : w < 1 ? '€0 in this configuration' : Math.round(w),
      ddEvidence(r), d.status(r.id), s?.owner || '', s?.dueDate || '', s?.note || '']);
  }
  head(ws); ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.getColumn(10).alignment = { wrapText: true, vertical: 'top' };
}

/** Coefficients: the ones nobody can see. */
function coefficients(wb: Workbook, d: DdPackData, label: (id: string) => string): void {
  const ws = wb.addWorksheet('DD_Coefficients');
  cols(ws, [['ID', 22], ['Used in', 22], ['Coefficient', 34], ['Value', 12], ['Where in the model', 26], ['Effect on the result', 76], ['Editable in the UI', 22]]);
  for (const r of d.rows.filter((x) => x.cls === 'PC5')) ws.addRow([r.id, ddUseText(r), r.l, typeof r.v === 'number' && !isNaN(r.v) ? r.v : null, r.where, r.eff, ddEditText(coefSheetEdit(r), label)]);
  head(ws);
}

/** Evidence requests: only what is still open, requested or disputed, by role. */
function evidence(wb: Workbook, d: DdPackData): void {
  const ws = wb.addWorksheet('DD_Evidence_Requests');
  cols(ws, [['Confirming role', 28], ['Element', 36], ['What we need from you', 90], ['Provided? (yes/no)', 18], ['Reference / attachment', 36]]);
  d.rows.filter((r) => ['open', 'requested', 'disputed'].includes(d.status(r.id))).sort((a, b) => ddRole(a).localeCompare(ddRole(b)))
    .forEach((r) => ws.addRow([ddRole(r), r.l, ddEvidence(r), '', '']));
  head(ws);
}

function coverage(wb: Workbook, d: DdPackData, product?: string): void {
  const ws = wb.addWorksheet('DD_Coverage'), n = d.rows.length, done = d.rows.filter(d.done).length;
  let wTot = 0, wDone = 0;
  if (d.fresh) for (const r of d.rows) { const x = d.weight(r.id); if (x == null) continue; wTot += x; if (d.done(r)) wDone += x; }
  cols(ws, [['Measure', 46], ['Value', 24]]);
  ws.addRow(['Elements requiring confirmation', n]);
  ws.addRow(['Confirmed or waived (item count)', `${done} (${n ? Math.round((done / n) * 100) : 0}%)`]);
  ws.addRow(['Confirmed by € weight', d.fresh && wTot > 0 ? `${Math.round((wDone / wTot) * 100)}%` : 'not measured']);
  ws.addRow(['Coefficients editable nowhere in the UI', d.rows.filter((r) => r.cls === 'PC5' && coefSheetEdit(r) === 'NONE').length]);
  ws.addRow([`Y${d.endYear} savings in the current case`, kEuro(d.endSavings)]);
  ws.addRow(['', ' ']);
  ws.addRow(['Provenance notice', 'The metric anchors and embedded coefficients ship with NO documented source. They are engineering estimates, not benchmarks. Every PC4 and PC5 row is an open question until confirmed.']);
  ws.addRow(['Re-import', 'Annotated packs re-import through the Due diligence tab. Only State / Owner / Due date / Note are read back — no model value can be changed by this path.']);
  if (product !== undefined) ws.addRow(['Product (effective case of this pack)', product]);
  head(ws); ws.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
}

/** The due-diligence pack: DD_Register, DD_Coefficients, DD_Evidence_Requests, DD_Coverage (legacy ddExportPack). `label` names a section from its id.
 * `product` (portfolios only) names the product whose effective case the pack describes: a portfolio exports the ACTIVE product's pack, see
 * docs/ARCHITECTURE.md §5. */
export function buildDdPack(xl: ExcelJS, d: DdPackData, label: (id: string) => string, print: Readonly<ThemeValues>, product?: string): Workbook {
  const wb = withPrint(new xl.Workbook(), print);
  wb.creator = 'AgentCase'; wb.created = new Date();
  register(wb, d, label); coefficients(wb, d, label); evidence(wb, d); coverage(wb, d, product);
  return wb;
}
