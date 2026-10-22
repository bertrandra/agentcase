/** @calc-zone exports */
import type * as XL from 'exceljs';
import type { CostFmt, CostModel, CostRow, CostTable } from '@/domain/portfolio';

/** Layout shared by the three tabs: 7 key columns, Unit, t0, M1..Mn, Total; header block above, table header on row HDR, data from FIRST. */
export const KEYS = 7, HDR = 10, FIRST = 11;
export const T0 = KEYS + 2;
export const colLetter = (n: number): string => { let s = ''; for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s; return s; };
export const lastMonthCol = (m: CostModel): number => T0 + m.horizon;

const NAVY = 'FF1E2761', GREY = 'FF808080', SUB = 'FFE8ECF7', FORMATS: Record<CostFmt, string> = { days: '#,##0.00', pct: '0.0', eur: '#,##0', rate: '#,##0.00', fte: '0.000', factor: '0.000000' };

/** Text cells never start a formula: a leading = + - @ (or tab / CR) is neutralised with an apostrophe, like the other writers do for names typed by users. */
export const txt = (s: string): string => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

export interface Meta { version: string; generated: Date }

/** Title, scope, generated date, app version, currency, convention and the tab's own notes (rows 1-8); row 9 is blank. */
export function writeHeader(ws: XL.Worksheet, m: CostModel, meta: Meta, tab: string, note: string): void {
  const put = (r: number, label: string, value: string, bold = false) => {
    ws.getCell(r, 1).value = txt(label); ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 3).value = txt(value); ws.getCell(r, 3).font = { bold };
  };
  ws.getCell(1, 1).value = txt(`${m.title} — ${tab}`); ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: NAVY } };
  put(2, 'Scope', m.scopeLabel, true); put(3, 'Generated (UTC)', meta.generated.toISOString().slice(0, 19).replace('T', ' ')); put(4, 'App version', `v${meta.version}`); put(5, 'Currency', m.currency);
  put(6, 'Convention', 'Calendar months of the portfolio: M1 = first portfolio month (month labels also show the date when the portfolio start date is set). t0 = AS-IS reference (entry team before transformation, per month). A product contributes only from its own month 1 (wave start + offset): earlier cells are EMPTY, not zero (its Knowledge-transfer setup may come before). Total = sum of M1..Mn (t0 excluded).');
  put(7, 'How to recompute', note);
  put(8, 'Not exported', m.excluded.length ? `${m.excluded.join(', ')} (archived or without a wave)` : 'None: every product of the scope is planned');
}

/** Header row, key/unit/t0/month/Total cells, formats, freeze panes, autofilter, widths and print setup. `fx` gives the Excel formula of a derived cell (c = column letter, n = month number, 0 for t0). */
export function writeTable(ws: XL.Worksheet, m: CostModel, t: CostTable, widths: number[], fx: (r: CostRow, c: string, n: number) => string | undefined): void {
  const last = lastMonthCol(m), total = last + 1, heads = [...t.keyHeads, 'Unit', 't0', ...m.monthLabels, 'Total'];
  heads.forEach((h, i) => {
    const c = ws.getCell(HDR, i + 1);
    c.value = txt(h); c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { horizontal: i < KEYS + 1 ? 'left' : 'center', wrapText: true };
  });
  t.rows.forEach((r, k) => {
    const n = FIRST + k, cell = (col: number, v: number | null, num: number) => {
      if (v === null) return;
      const f = r.f ? fx(r, colLetter(col), num) : undefined, c = ws.getCell(n, col);
      c.value = f ? { formula: f, result: v } : v; c.numFmt = FORMATS[r.fmt];
    };
    r.keys.forEach((s, i) => { ws.getCell(n, i + 1).value = txt(s); });
    ws.getCell(n, KEYS + 1).value = txt(r.unit);
    cell(T0, r.t0, 0); r.months.forEach((v, i) => cell(T0 + 1 + i, v, i + 1));
    if (r.total !== null) {
      const c = ws.getCell(n, total), any = r.months.some((x) => x !== null);
      c.value = any ? { formula: `SUM(${colLetter(T0 + 1)}${n}:${colLetter(last)}${n})`, result: r.total } : r.total; c.numFmt = FORMATS[r.fmt];
    }
    const style = r.bold ? { bold: true } : r.role === 'driver' || r.role === 'info' || r.role === 'memo' ? { italic: true, color: { argb: GREY } } : {};
    for (let col = 1; col <= total; col++) {
      const c = ws.getCell(n, col);
      c.font = style;
      if (r.bold) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUB } };
    }
  });
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.getColumn(KEYS + 1).width = 14; ws.getColumn(T0).width = 12;
  for (let col = T0 + 1; col <= total; col++) ws.getColumn(col).width = 11;
  ws.getRow(HDR).height = 30;
  ws.views = [{ state: 'frozen', xSplit: 5, ySplit: HDR }];
  ws.autoFilter = { from: { row: HDR, column: 1 }, to: { row: HDR + t.rows.length, column: total } };
  ws.pageSetup = { orientation: 'landscape', paperSize: 8 as XL.PaperSize, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${HDR}:${HDR}`, printTitlesColumn: 'A:E' };
}
