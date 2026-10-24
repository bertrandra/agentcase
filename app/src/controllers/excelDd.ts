/** @calc-zone exports */
import type { DdState } from '@/domain/pdc/dd';
import { defineCommand } from '@/store/commands';
import { activeDoc, editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { ddPackData } from '@/store/persistence/excel/dd/data';
import { buildDdPack } from '@/store/persistence/excel/dd/pack';
import { MAX_PACK_BYTES, readDdRegister, type PackEntry } from '@/store/persistence/excel/dd/read';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';
import { excelFilename, XLSX_MIME, type ExcelFile } from './excelResults';
import { exportTheme } from './exportTheme';

/** Merge the annotated rows into the register: a blank cell keeps what was there, an unknown status keeps the current one. */
const importCmd = defineCommand<{ entries: PackEntry[] }>({
  type: 'dd.importPack', label: (p) => `Import ${p.entries.length} due-diligence annotation(s) from an Excel pack`,
  run(d, p) {
    const all = (d.DD_STATE ??= {}) as DdState;
    for (const e of p.entries) {
      const cur = all[e.id] ?? {};
      all[e.id] = { st: e.st ?? cur.st ?? 'open', owner: e.owner || cur.owner || '', dueDate: e.dueDate || cur.dueDate || '', note: e.note || cur.note || '' };
    }
  },
});

/** Apply already-validated pack rows as one undoable command. */
export const applyDdPackEntries = (entries: PackEntry[]): void => { if (entries.length) appStore().dispatch(importCmd({ entries })); };

/**
 * The due-diligence pack of the current case (DD_Register, DD_Coefficients, DD_Evidence_Requests, DD_Coverage). `label` names a section from its id.
 * DECISION (P5): with a portfolio the pack is the ACTIVE product's, with its name on DD_Coverage. The annotations (state, owner, due date, note) live once in
 * the document (`DD_STATE`, a common key shared by every product) and the re-import reads the sheet named DD_Register, so one sheet group per product would
 * hold conflicting copies of the same ids. Switch the active product to export another one.
 */
export async function exportDdPack(label: (id: string) => string = (id) => id, now: Date = new Date()): Promise<ExcelFile> {
  const doc = activeDoc(), portfolio = appStore().getState().portfolio, product = hasPortfolioContent(portfolio) ? portfolio.products.find((p) => p.id === portfolio.activeProductId)?.name : undefined;
  const xl = await loadExcelJS(), wb = buildDdPack(xl, ddPackData(doc), label, exportTheme(), product);
  return { blob: new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), filename: excelFilename('DueDiligence', now) };
}

export interface DdImportResult { ok: boolean; message: string }

/**
 * Re-import an annotated pack. Only State / Owner / Due date / Note are read back, so no model value can change; the whole import is ONE undoable
 * command. A file that is not a workbook, has no DD_Register sheet or is oversized leaves the case untouched and says why.
 */
export async function importDdPack(file: { size?: number; arrayBuffer(): Promise<ArrayBuffer> }): Promise<DdImportResult> {
  try {
    if ((file.size ?? 0) > MAX_PACK_BYTES) return { ok: false, message: 'Import failed: the file is too large for a due-diligence pack.' };
    const xl = await loadExcelJS(), wb = new xl.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const known = new Set(ddPackData(editBase()).rows.map((r) => r.id)), read = readDdRegister(wb, known);
    if (!read) return { ok: false, message: 'No DD_Register sheet found in that file.' };
    applyDdPackEntries(read.entries);
    const unknown = read.unknown ? ` · ${read.unknown} unknown id(s) ignored` : '';
    return { ok: true, message: `${read.applied} row(s) applied · ${read.skipped} unchanged${unknown} — no model value was modified by this import.` };
  } catch (e) {
    return { ok: false, message: `Import failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
