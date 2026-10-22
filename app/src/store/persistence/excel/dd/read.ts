/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import type { DdStatus } from '@/domain/pdc/dd';
import { cleanText, safeId } from '../params/safe';

const VALID: ReadonlySet<string> = new Set(['open', 'requested', 'confirmed', 'disputed', 'waived']);   // a Set: the legacy object lookup also accepted 'constructor' and 'toString'
export const MAX_PACK_BYTES = 25 * 1024 * 1024;
/** A pack has ~100 rows; anything beyond this is not read (a hostile sheet may declare millions). */
export const MAX_PACK_ROWS = 20000;

/** A cell as text: dates as YYYY-MM-DD, rich text and hyperlinks flattened, formulas by their result, errors and anything else as ''. */
export function cellStr(x: unknown, depth = 0): string {
  if (x == null || depth > 4) return '';
  if (x instanceof Date) return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10);
  if (typeof x === 'object') {
    const o = x as { richText?: unknown; text?: unknown; result?: unknown };
    if (Array.isArray(o.richText)) return o.richText.map((r: { text?: unknown }) => (typeof r?.text === 'string' ? r.text : '')).join('');
    if (o.text != null) return cellStr(o.text, depth + 1);
    if (o.result != null) return cellStr(o.result, depth + 1);
    return '';
  }
  return String(x);
}

/** One annotated row of the register that carries something to apply. */
export interface PackEntry { id: string; st?: DdStatus; owner: string; dueDate: string; note: string }
export interface PackRead { entries: PackEntry[]; applied: number; skipped: number; unknown: number }

/**
 * Read the annotated rows of the DD_Register sheet: only State / Owner / Due date / Note (columns 11-14) are taken, keyed by the id in
 * column 1. Rows without an id are ignored, rows with nothing to apply are `skipped`, rows whose id is not in `known` are `unknown`.
 * Returns null when the workbook has no DD_Register sheet. Pure: nothing is written.
 */
export function readDdRegister(wb: Workbook, known: ReadonlySet<string>): PackRead | null {
  const ws = wb.getWorksheet('DD_Register');
  if (!ws) return null;
  const out: PackRead = { entries: [], applied: 0, skipped: 0, unknown: 0 };
  const last = Math.min(ws.rowCount, MAX_PACK_ROWS);
  for (let i = 2; i <= last; i++) {
    const row = ws.getRow(i);
    if (!row.hasValues) continue;
    const id = safeId(cellStr(row.getCell(1).value));
    if (!id) continue;
    const stv = cellStr(row.getCell(11).value).trim().toLowerCase(), valid = VALID.has(stv);
    const owner = cleanText(cellStr(row.getCell(12).value), 120), dueDate = cleanText(cellStr(row.getCell(13).value), 40), note = cleanText(cellStr(row.getCell(14).value), 500);
    if (!valid && !owner && !dueDate && !note) { out.skipped++; continue; }
    if (!known.has(id)) { out.unknown++; continue; }
    out.entries.push({ id, ...(valid ? { st: stv as DdStatus } : {}), owner, dueDate, note });
    out.applied++;
  }
  return out;
}
