import type * as XL from 'exceljs';

/** The rows of a sheet as plain values (row 1 included), blank rows kept. */
export const rows = (wb: XL.Workbook, name: string): unknown[][] => {
  const out: unknown[][] = [];
  wb.getWorksheet(name)!.eachRow({ includeEmpty: true }, (r) => { out.push((r.values as unknown[]).slice(1)); });
  return out;
};
