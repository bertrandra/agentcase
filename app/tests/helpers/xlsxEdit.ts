import type * as XL from 'exceljs';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { paramsWorkbookBytes } from '@/store/persistence/excel/params';
import type { Doc } from '@/store/types';
import { ENV, freshDoc } from './excelParams';
import { THEME_DEFAULT } from '@/domain/theme';

/** Open a workbook, let the test change it, return the new bytes (how the tests play the customer editing the file in Excel). */
export async function editXlsx(bytes: ArrayBuffer, fn: (wb: XL.Workbook) => void): Promise<ArrayBuffer> {
  const X = await loadExcelJS(), wb = new X.Workbook();
  await wb.xlsx.load(bytes);
  fn(wb);
  const out = new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}
/** The workbook our writer produces for a case (default case unless given). */
export const ourXlsx = (doc: Doc = freshDoc()): Promise<ArrayBuffer> => paramsWorkbookBytes(doc, 'all', ENV, THEME_DEFAULT);
/** Set a cell by the text of column A (label) — the Parameters / Reg Settings sheets are label → value. */
export function setByLabel(wb: XL.Workbook, sheet: string, label: string, value: XL.CellValue, col = 2): void {
  wb.getWorksheet(sheet)?.eachRow((r) => { if (String(r.getCell(1).value) === label) r.getCell(col).value = value; });
}
export const asFile = (name: string, bytes: ArrayBuffer) => ({ name, size: bytes.byteLength, arrayBuffer: async () => bytes });

/**
 * A syntactically valid zip directory that declares `declared` bytes inflating from `packed` (no real data: the guard must refuse it before inflating
 * anything).
 */
export function fakeZip(declared: number, packed: number, entries = 1): ArrayBuffer {
  const name = new TextEncoder().encode('xl/x.xml'), cd = 46 + name.length, buf = new ArrayBuffer(30 + entries * cd + 22), v = new DataView(buf);
  v.setUint32(0, 0x04034b50, true);
  for (let i = 0; i < entries; i++) {
    const p = 30 + i * cd;
    v.setUint32(p, 0x02014b50, true); v.setUint32(p + 20, packed, true); v.setUint32(p + 24, declared, true); v.setUint16(p + 28, name.length, true);
    new Uint8Array(buf, p + 46, name.length).set(name);
  }
  const e = 30 + entries * cd;
  v.setUint32(e, 0x06054b50, true); v.setUint16(e + 10, entries, true); v.setUint32(e + 12, entries * cd, true); v.setUint32(e + 16, 30, true);
  return buf;
}
