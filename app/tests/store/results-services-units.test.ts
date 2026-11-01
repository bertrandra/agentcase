import { describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { appStore } from '@/store/instance';
import { servicesView } from '@/domain/portfolio';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { serviceThree } from '../helpers/services';
import { unitTreeThree } from '../helpers/unitScope';
import { rows } from '../helpers/xlsxRows';

/** SPEC_FIXES FX-31: the portfolio results workbook carries a Services sheet and, under a Unit scope, one sheet per sub-unit after the unit's. */
const NOW = new Date('2026-11-01T10:00:00Z');
const book = async (scope: Parameters<typeof exportResultsWorkbook>[2]) => {
  const out = await exportResultsWorkbook(undefined, NOW, scope), wb = new (await loadExcelJS()).Workbook();
  await wb.xlsx.load(await out.blob.arrayBuffer());
  return wb;
};

describe('results workbook: services and sub-units', () => {
  it('Services: the delivery by product and the lines, the figures of the Services view', async () => {
    serviceThree();
    const v = servicesView(appStore().getState().portfolio)[0]!, wb = await book({ kind: 'portfolio' }), r = rows(wb, 'Services');
    expect(r.find((x) => x[0] === `${v.name}: annual cost`)![1]).toBe(v.cost);
    for (const p of v.products) expect(r.find((x) => x[0] === p.name && x[5] === p.cost), p.name).toBeTruthy();
    expect(r.find((x) => x[1] === 'split by effort')).toBeTruthy();
  });
  it('no shared service: no Services sheet', async () => {
    unitTreeThree();
    expect((await book({ kind: 'portfolio' })).worksheets.map((w) => w.name)).not.toContain('Services');
  });
  it('under a Unit scope: the unit leads, then one sheet per sub-unit', async () => {
    unitTreeThree();
    const names = (await book({ kind: 'unit', id: 'bu' })).worksheets.map((w) => w.name);
    expect(names.slice(0, 3)).toEqual(['Unit Retail BU', 'Unit Payments', 'Unit Lending']);
  });
});
