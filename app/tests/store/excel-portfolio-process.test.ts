import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { addProcessActivity, addProcessActor } from '@/controllers/process';
import { setActiveProduct } from '@/controllers/product';
import { consolidate, portfolioHeadline } from '@/domain/portfolio';
import { readProcess, serialize, type XDocument } from '@/domain/process';
import { appStore } from '@/store/instance';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { ENV } from '../helpers/excelParams';
import { fourProducts, pfNow } from '../helpers/portfolioFixtures';
import { CUSTOM } from './samples/process';
import { freshStore } from './helpers';

/**
 * Phase B5 (docs/SPEC_BPMN.md F-B20, open question 3 of B3): a product that overrides its process keeps its own document through the parameters
 * workbook. The Overrides sheet carries the document's XML text (key `BPMN`) after the version 2 scope rows; the import reads the document back
 * and lays the scope rows (edited in Excel or not) over it. Before B5 a product's document was rebuilt as the common one plus its scope rows, so a
 * custom activity or role was lost.
 */
const file = (b: ArrayBuffer) => ({ name: 'pf.xlsx', size: b.byteLength, arrayBuffer: async () => b });
const bytes = async (): Promise<ArrayBuffer> => (await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer());
const docOf = (id: string): XDocument => pfNow().products.find((p) => p.id === id)?.overrides.BPMN as XDocument;

/** The 4-product portfolio with a custom role and a custom activity in the third product's own process. */
function customised(): string {
  fourProducts();
  const c = pfNow().products[2]!.id;
  setActiveProduct(c);
  addProcessActor({ id: 'role-sre', name: 'SRE', kind: 'role', teamSkill: 'Ops/Run' });
  addProcessActivity({ ...CUSTOM, skill: 'SRE' });
  return c;
}

describe('portfolio parameters workbook: a product process override survives the round trip (B5)', () => {
  it('the custom activity and role of a product come back, the document byte for byte, the figures equal', async () => {
    const c = customised(), before = pfNow(), text = serialize(docOf(c));
    expect(readProcess(docOf(c)).activities.some((a) => a.id === CUSTOM.id)).toBe(true);
    const b = await bytes();
    freshStore();
    await importParamsWorkbook(file(b), ENV);
    expect(serialize(docOf(c))).toBe(text);
    expect(readProcess(docOf(c)).actors.find((a) => a.id === 'role-sre')).toMatchObject({ name: 'SRE', teamSkill: 'Ops/Run' });
    expect(portfolioHeadline(consolidate(pfNow())).npv).toBeCloseTo(portfolioHeadline(consolidate(before)).npv, 6);
  });
  it('a scope row edited in Excel still applies, on the product\'s own document', async () => {
    const c = customised(), wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(await bytes());
    const ov = wb.getWorksheet('Overrides')!;
    ov.eachRow((r) => { if (r.getCell(1).value === c && r.getCell(2).value === 'regInclude') r.getCell(4).value = 'false'; });
    const b = await wb.xlsx.writeBuffer() as ArrayBuffer;
    freshStore();
    await importParamsWorkbook(file(b), ENV);
    expect(readProcess(docOf(c)).params.regInclude).toBe(false);
    expect(readProcess(docOf(c)).activities.some((a) => a.id === CUSTOM.id)).toBe(true);
  });
  it('a damaged document is refused with the product named, and nothing is written', async () => {
    const c = customised(), wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(await bytes());
    const ov = wb.getWorksheet('Overrides')!;
    const first = (r: { getCell(i: number): { value: unknown } }) => r.getCell(1).value === c && r.getCell(2).value === 'BPMN' && r.getCell(3).value === 1;
    ov.eachRow((r) => { if (first(r)) r.getCell(4).value = '"<!DOCTYPE x>'; });   // the JSON string goes on in the next parts
    const b = await wb.xlsx.writeBuffer() as ArrayBuffer;
    const undo = appStore().getState().history.undo.length;
    await expect(importParamsWorkbook(file(b), ENV)).rejects.toThrow(/process of product/);
    expect(appStore().getState().history.undo).toHaveLength(undo);
  });
});
