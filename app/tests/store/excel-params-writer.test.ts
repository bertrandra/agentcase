import { readFileSync } from 'node:fs';
import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { refitPotential } from '@/store/derive';
import type { Doc } from '@/store/types';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { loadParamsSheets, paramsWorkbookBytes } from '@/store/persistence/excel/params';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { ENV, legacyXlsx, xlsxIds } from '../helpers/excelParams';

const ids = xlsxIds().filter((id) => !id.startsWith('xl-'));
/** Cells whose text differs from the legacy file on purpose: none today (reference columns are reproduced too). */
const SKIP = new Set<string>([]);
/** DEV-ARCH-CONTENT: the two architecture sections have a new catalogue description (Sections sheet, description column), so the legacy text differs on purpose. */
const ARCH_DESC = /^(One-line-each index of the 5 layers|Full technical detail: functions, code references, wiring status)/;
const archDescription = (name: string, v: unknown): boolean => name === 'Sections' && typeof v === 'string' && ARCH_DESC.test(v);
const same = (a: unknown, b: unknown, sheet = ''): boolean => {
  if (typeof a !== 'number' || typeof b !== 'number') return a === b;
  // the legacy "Location Target" sheet rounds to whole % (losing the cost-relevant decimals on re-import); ours keeps one decimal
  return sheet === 'Location Target' ? Math.abs(a - b) <= 0.5 : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
};

/** Look of a sheet: frozen header, column widths, data-validation cells and header fill. */
async function look(buf: ArrayBuffer): Promise<Record<string, unknown>> {
  const X = await loadExcelJS(), wb = new X.Workbook(); await wb.xlsx.load(buf);
  return Object.fromEntries(wb.worksheets.map((ws) => [ws.name, {
    frozen: ws.views[0]?.state, widths: ws.columns.map((c) => c.width), dv: Object.keys((ws as unknown as { dataValidations: { model: Record<string, unknown> } }).dataValidations.model).length,
    head: JSON.stringify(ws.getRow(1).getCell(1).fill) + JSON.stringify(ws.getRow(1).getCell(1).font?.bold),
  }]));
}

describe('our writer reproduces the legacy workbook layout and values', () => {
  it.each(ids)('%s', async (id) => {
    // the legacy page re-fits the potential to the scope when it opens a case; ours keeps the stored value (a known legacy difference), so fit it first
    const doc = produce(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), (d) => { refitPotential(d as Doc); });
    const mine = await loadParamsSheets(await paramsWorkbookBytes(doc, 'all', ENV)), theirs = await loadParamsSheets(legacyXlsx(id));
    expect([...mine.keys()]).toEqual([...theirs.keys()]);   // same sheets, same order
    const diffs: string[] = [];
    theirs.forEach((rows, name) => {
      const m = mine.get(name) ?? [];
      if (m.length !== rows.length) diffs.push(`${name}: ${m.length} rows vs ${rows.length}`);
      rows.forEach((r, i) => r.forEach((v, j) => { if (!SKIP.has(name) && !archDescription(name, v) && !same(v, m[i]?.[j], name)) diffs.push(`${name}!${i + 1}:${j + 1} legacy=${JSON.stringify(v)} ours=${JSON.stringify(m[i]?.[j])}`); }));
    });
    expect(diffs.slice(0, 8)).toEqual([]);
    expect(await look(await paramsWorkbookBytes(doc, 'all', ENV))).toEqual(await look(legacyXlsx(id)));
  });
});
