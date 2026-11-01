/** @calc-zone exports */
import type * as XL from 'exceljs';
import { ownerIn, readStoredOrg, SOURCINGS, UNIT_TYPES } from '@/domain/org';
import type { Portfolio } from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import { listDV, ynDV } from '../params/kit';
import { PF_SHEETS } from './names';

type Ws = (wb: XL.Workbook, name: string, widths: number[]) => XL.Worksheet;
type Row = (row: XL.Row, n: number) => void;

/**
 * Units and Owners (SPEC_FIXES FX-30, § 21.7): the organisation units the common document stores (id, name, type, parent, location, cost centre,
 * sourcing, the shared-service flag with its activity types and roles) and the owner unit of each product. Read back by `readOrg`.
 */
export function writeOrg(wb: XL.Workbook, pf: Portfolio, ws: Ws, finish: (w: XL.Worksheet) => void, inputs: Row): void {
  const d = pf.common.BPMN as XDocument | undefined, units = readStoredOrg(d as XDocument).units;
  const u = ws(wb, PF_SHEETS.units, [18, 28, 18, 18, 14, 14, 12, 12, 30, 30]);
  for (const x of units) {
    inputs(u.addRow([x.id, x.name, x.type, x.parent ?? '', x.location ?? '', x.costCentre ?? '', x.sourcing ?? '', x.service ? 'Yes' : '',
      (x.service?.skills ?? []).join(';'), (x.service?.roles ?? []).join(' ')]), 10);
  }
  for (let r = 2; r <= units.length + 50; r++) {
    u.getCell(`C${r}`).dataValidation = listDV([...UNIT_TYPES], 'Unit type'); u.getCell(`G${r}`).dataValidation = listDV([...SOURCINGS], 'Sourcing');
    u.getCell(`H${r}`).dataValidation = ynDV();
  }
  finish(u);
  const o = ws(wb, PF_SHEETS.owners, [16, 26]);
  for (const p of pf.products) inputs(o.addRow([p.id, ownerIn(d, p.id) ?? '']), 2);
  finish(o);
}
