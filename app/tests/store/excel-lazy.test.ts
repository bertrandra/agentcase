import { describe, expect, it } from 'vitest';
import { loadExcelJS } from '@/store/persistence/excel/lazy';

describe('ExcelJS loader', () => {
  it('builds a workbook and reads it back', async () => {
    const X = await loadExcelJS();
    const wb = new X.Workbook(); wb.addWorksheet('A').addRow(['x', 1]);
    const buf = await wb.xlsx.writeBuffer();
    const wb2 = new X.Workbook(); await wb2.xlsx.load(buf as ArrayBuffer);
    expect(wb2.getWorksheet('A')?.getRow(1).getCell(2).value).toBe(1);
  });
});
