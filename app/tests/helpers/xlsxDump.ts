import { readFileSync } from 'node:fs';
import type { Row } from 'exceljs';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';

export type Cell = number | string | boolean | null | { f: unknown; r: Cell };
export interface SheetDump { name: string; rowCount: number; columnCount: number; rows: Cell[][] }
export const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

/** Mirror of dumpCell() in tools/xlsx-dump.mjs. */
export function dumpCell(v: unknown): Cell {
  if (v == null) return null;
  if (v instanceof Date) return `date:${v.toISOString()}`;
  if (typeof v === 'object') {
    const o = v as { richText?: { text?: string }[]; formula?: unknown; sharedFormula?: unknown; result?: unknown; text?: unknown; error?: string };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text || '').join('');
    if (o.formula != null || o.sharedFormula != null) return { f: o.formula ?? o.sharedFormula, r: dumpCell(o.result) };
    if (o.text != null) return String(o.text);
    if (o.error) return `error:${o.error}`;
    return null;
  }
  return v as Cell;
}

/** Mirror of dumpWorkbook(): every row of every sheet, trailing empty cells trimmed, images ignored. */
export async function dumpBuffer(buf: ArrayBuffer): Promise<SheetDump[]> {
  const X = await loadExcelJS(), wb = new X.Workbook();
  await wb.xlsx.load(buf);
  return wb.worksheets.map((ws) => {
    const rows: Cell[][] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const vals: Cell[] = [], row = ws.getRow(r);
      for (let c = 1; c <= ws.columnCount; c++) vals.push(dumpCell(row.getCell(c).value));
      while (vals.length && vals[vals.length - 1] === null) vals.pop();
      rows.push(vals);
    }
    return { name: ws.name, rowCount: ws.rowCount, columnCount: ws.columnCount, rows };
  });
}

/** Cell-by-cell differences; numbers match within 1e-6 relative, everything else exactly. Empty list = identical. */
export function sheetDiffs(exp: SheetDump[], got: SheetDump[]): string[] {
  const out: string[] = [];
  if (exp.map((s) => s.name).join('|') !== got.map((s) => s.name).join('|')) return [`sheets: ${exp.map((s) => s.name)} vs ${got.map((s) => s.name)}`];
  exp.forEach((s, i) => {
    const g = got[i]!;
    if (s.rowCount !== g.rowCount || s.columnCount !== g.columnCount) out.push(`${s.name}: ${s.rowCount}x${s.columnCount} vs ${g.rowCount}x${g.columnCount}`);
    s.rows.forEach((row, r) => row.forEach((e, c) => {
      const a = g.rows[r]?.[c] ?? null, at = `${s.name}!R${r + 1}C${c + 1}`;
      if (typeof e === 'number' && typeof a === 'number') { if (Math.abs(e - a) > 1e-6 * Math.max(1, Math.abs(e))) out.push(`${at}: ${e} vs ${a}`); }
      else if (JSON.stringify(e) !== JSON.stringify(a)) out.push(`${at}: ${JSON.stringify(e)} vs ${JSON.stringify(a)}`);
    }));
    g.rows.forEach((row, r) => { if (row.length > (s.rows[r]?.length ?? 0)) out.push(`${s.name}: extra cells in row ${r + 1}`); });
  });
  return out.slice(0, 20);
}

type EditValue = string | number | { date: string } | { rich: string } | { formula: string; result: string };
export interface DdEdits { rows: { id: string; st?: EditValue; owner?: EditValue; due?: EditValue; note?: EditValue }[];
  append: { id: string; st?: EditValue; note?: EditValue }[] }
const asCell = (v: EditValue) => (typeof v === 'object' ? ('date' in v ? new Date(v.date) : 'rich' in v ? { richText: [{ text: v.rich.slice(0, 4) },
  { text: v.rich.slice(4) }] } : { formula: v.formula, result: v.result }) : v);

/** Mirror of editDdWorkbook() in tools/xlsx-dump.mjs: the hand edits a client makes to a pack, returned as a new .xlsx. */
export async function editPack(buf: ArrayBuffer, edits: DdEdits): Promise<ArrayBuffer> {
  const X = await loadExcelJS(), wb = new X.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('DD_Register')!, at: Record<string, Row> = {};
  ws.eachRow((row, i) => { if (i > 1) at[String(row.getCell(1).value)] = row; });
  const put = (row: Row, e: DdEdits['rows'][number]) => {
    const cols: [number, EditValue | undefined][] = [[11, e.st], [12, e.owner], [13, e.due], [14, e.note]];
    for (const [col, v] of cols) if (v !== undefined) row.getCell(col).value = asCell(v) as never;
  };
  for (const e of edits.rows) { const row = at[e.id]; if (row) put(row, e); }
  for (const e of edits.append) put(ws.addRow([e.id]), e);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Install a store on the oracle case `id`, optionally customising the document first. */
export function loadCase(id: string, tweak?: (d: Doc) => void) {
  const doc = fromSnapshot(readJson(`fixtures/cases/${id}.json`));
  tweak?.(doc);
  const s = createAppStore(doc);
  setAppStore(s);
  return s;
}
