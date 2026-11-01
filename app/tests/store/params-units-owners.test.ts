import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { ownerIn, readStoredOrg } from '@/domain/org';
import type { XDocument } from '@/domain/process';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { workbookBytes } from '@/store/persistence/excel/params/writer';
import { appStore } from '@/store/instance';
import { ENV } from '../helpers/excelParams';
import { threeProducts } from '../helpers/portfolioStore';
import { unitTreeThree } from '../helpers/unitScope';

/** SPEC_FIXES FX-30: the parameters workbook of a portfolio carries Units and Owners; round trip; a refused import names the unit. */
const common = () => appStore().getState().portfolio.common.BPMN as XDocument;
const file = (b: ArrayBuffer) => ({ name: 'pf.xlsx', size: b.byteLength, arrayBuffer: async () => b });

describe('parameters workbook: units and owners', () => {
  it('export, open a portfolio without units, import: the same units and owners come back', async () => {
    const t = unitTreeThree(), units = readStoredOrg(common()).units, owners = t.ids.map((id) => ownerIn(common(), id));
    const b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    threeProducts();   // a fresh portfolio without units
    expect(readStoredOrg(common()).units).toEqual([]);
    await importParamsWorkbook(file(b), ENV);
    expect(readStoredOrg(common()).units).toStrictEqual(units);
    expect(t.ids.map((id) => ownerIn(common(), id))).toEqual(owners);
  });
  it('an owner naming a unit that is not in the Units sheet is refused, and the message names it; nothing is written', async () => {
    const t = unitTreeThree(), b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    const wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(b);
    wb.getWorksheet('Owners')!.getRow(2).getCell(2).value = 'ghost-unit';
    const before = appStore().getState().portfolio;
    await expect(importParamsWorkbook(file(await workbookBytes(wb)), ENV)).rejects.toThrow(/owner unit "ghost-unit" of product "[^"]+" is not a unit/);
    expect(appStore().getState().portfolio).toBe(before);
    expect(t.ids.length).toBe(3);
  });
  it('a parent outside the sheet is refused', async () => {
    unitTreeThree();
    const b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer(), wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(b);
    const u = wb.getWorksheet('Units')!, r = [...Array(u.rowCount).keys()].map((i) => u.getRow(i + 1)).find((x) => x.getCell(1).value === 'd3')!;
    r.getCell(4).value = 'nowhere';
    await expect(importParamsWorkbook(file(await workbookBytes(wb)), ENV)).rejects.toThrow(/parent unit "nowhere" is not in the Units sheet/);
  });
});
