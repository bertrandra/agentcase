import type { Workbook } from 'exceljs';
import { fmtRoiPct, roiCanonical } from '@/domain/economics';
import type { ResultsData, SheetImages } from './data';
import { addImage, head, r0 } from './style';

/** ROI sheet: headline metrics, then Benefit / Net / Cumulative per year. */
export function roiSheet(wb: Workbook, { v }: ResultsData, images?: SheetImages): void {
  const ws = wb.addWorksheet('ROI'), H = v.H, setup = v.setup, pb = v.payback;
  ws.addRow(['Metric', 'Value']);
  ws.addRow([`${H}-year ROI`, fmtRoiPct(roiCanonical(v.totalBenefit - setup, setup))]);
  ws.addRow([`Total benefits (${H}y)`, r0(v.totalBenefit)]);
  ws.addRow(['Setup investment', r0(setup)]);
  ws.addRow([`Net profit (${H}y)`, r0(v.totalBenefit - setup)]);
  // The legacy prints ">36" (no unit) when payback is never reached and the month number otherwise.
  ws.addRow(['Payback (months)', pb == null || !isFinite(pb) ? `>${v.m.horizon * 12}` : pb <= 0 ? 'immediate' : pb]);
  ws.addRow([]);
  ws.addRow(['Year', 'Benefit', 'Net', 'Cumulative']);
  let cum = -setup;
  v.years.forEach((y, i) => { cum += y.savings; ws.addRow([`Y${i + 1}`, r0(y.savings), r0(y.savings - (i === 0 ? setup : 0)), r0(cum)]); });
  head(ws); addImage(wb, ws, 'ROI', images);
}
