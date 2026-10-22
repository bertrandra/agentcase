import type * as XL from 'exceljs';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { addProduct } from '@/controllers/product';
import { setProductOverride } from '@/controllers/productOverrides';
import { appStore } from '@/store/instance';
import { LIMITS } from '@/store/persistence/excel/params/safe';
import { ENV } from '../helpers/excelParams';
import { fourProducts, pfNow } from '../helpers/portfolioFixtures';
import { asFile, editXlsx } from '../helpers/xlsxEdit';
import { snapAll } from './helpers';

let ids: string[] = [];
beforeEach(() => { fourProducts(); ids = pfNow().products.map((p) => p.id); });
const base = async (): Promise<ArrayBuffer> => (await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer());

/** Edit the exported workbook, import it, and require a refusal with `msg` that leaves the portfolio and the history untouched. */
async function refused(edit: (wb: XL.Workbook) => void, msg: RegExp): Promise<void> {
  const bytes = await editXlsx(await base(), edit), before = snapAll(appStore()), undo = appStore().getState().history.undo.length;
  await expect(importParamsWorkbook(asFile('bad.xlsx', bytes), ENV)).rejects.toThrow(msg);
  expect(snapAll(appStore())).toBe(before);
  expect(appStore().getState().history.undo.length).toBe(undo);
}
const sheet = (wb: XL.Workbook, n: string): XL.Worksheet => wb.getWorksheet(n)!;

describe('overrides: the whitelist is enforced', () => {
  it.each(['values.horizon', 'values.khInfraMonthly', 'values.discountRate', 'RATE', 'MODEL.CASE.discountRate', 'COEF', 'MODEL', '__proto__', 'constructor', 'values.__proto__', 'checked.constructor', 'dom', 'unknownKey'])('refuses %s', async (key) => {
    await refused((wb) => sheet(wb, 'Overrides').addRow([ids[0], key, 1, '"x"']), /not an overridable key/);
  });
  it('refuses a value of the wrong type or invalid JSON', async () => {
    await refused((wb) => sheet(wb, 'Overrides').addRow([ids[0], 'lifecycleUse', 1, '"yes"']), /wrong type/);
    await refused((wb) => sheet(wb, 'Overrides').addRow([ids[0], 'selectedArtefacts', 1, '[1,2]']), /wrong type/);
    await refused((wb) => sheet(wb, 'Overrides').addRow([ids[0], 'values.y1Ramp', 1, '30']), /wrong type/);
    await refused((wb) => sheet(wb, 'Overrides').addRow([ids[0], 'checked.khEnabled', 1, '{bad']), /not valid JSON/);
  });
  it('refuses a duplicate override and a part out of sequence', async () => {
    await refused((wb) => { const w = sheet(wb, 'Overrides'); w.addRow([ids[0], 'lifecycleUse', 1, 'true']); w.addRow([ids[0], 'lifecycleUse', 1, 'true']); }, /duplicate override/);
    await refused((wb) => sheet(wb, 'Overrides').addRow([ids[0], 'lifecycleUse', 2, 'true']), /out of sequence/);
  });
  it('strips prototype keys from a nested value', async () => {
    const bytes = await editXlsx(await base(), (wb) => sheet(wb, 'Overrides').addRow([ids[0], 'scurve', 1, '{"__proto__":{"x":1},"family":"logistic"}']));
    await importParamsWorkbook(asFile('p.xlsx', bytes), ENV);
    const s = pfNow().products[0]!.overrides.scurve as unknown as Record<string, unknown>;
    expect(Object.keys(s)).toEqual(['family']);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe('ids, references and sizes', () => {
  it('refuses unknown product ids in every sheet that names a product', async () => {
    for (const [name, row] of [['TeamIn', ['nope', 'Dev', 'B1', 'France', 1, '']], ['Overrides', ['nope', 'lifecycleUse', 1, 'true']], ['KnowledgeSubsets', ['nope', 'Yes', 2]], ['KnowledgeDomains', ['nope', 'Docs', 100]]] as const) {
      await refused((wb) => sheet(wb, name).addRow([...row]), /unknown product "nope"/);
    }
  });
  it('refuses duplicate product ids and duplicate wave ids', async () => {
    await refused((wb) => sheet(wb, 'Products').addRow([ids[0], 'Again', '', 0, '', '', '']), /duplicate product id/);
    await refused((wb) => sheet(wb, 'Waves').addRow([pfNow().waves[0]!.id, 'Again', 0, '', 9]), /duplicate wave id/);
  });
  it('refuses an unsafe id, an unknown wave, a bad offset and a bad flag', async () => {
    await refused((wb) => sheet(wb, 'Products').addRow(['a b<script>', 'X', '', 0, '', '', '']), /product id must be/);
    await refused((wb) => { sheet(wb, 'Products').getRow(2).getCell(3).value = 'ghost'; }, /unknown wave "ghost"/);
    await refused((wb) => { sheet(wb, 'Products').getRow(2).getCell(4).value = -3; }, /offset must be/);
    await refused((wb) => { sheet(wb, 'Products').getRow(2).getCell(7).value = 'maybe'; }, /Yes or No/);
  });
  it('refuses domain weights that do not add up to 100', async () => {
    await refused((wb) => sheet(wb, 'KnowledgeDomains').addRow([ids[3], 'Docs', 30]), /add up to 30, expected 100/);
    await refused((wb) => { sheet(wb, 'KnowledgeDomains').getRow(2).getCell(3).value = 41; }, /add up to 101, expected 100/);
  });
  it('refuses an incomplete maturity block, an out-of-range target and a duplicate subset row', async () => {
    await refused((wb) => sheet(wb, 'KnowledgeSubsets').addRow([ids[3], '', '', '', '', '', 1]), /9 maturity answers or none/);
    await refused((wb) => sheet(wb, 'KnowledgeSubsets').addRow([ids[3], '', 7]), /target CC must be/);
    await refused((wb) => sheet(wb, 'KnowledgeSubsets').addRow([ids[1], 'Yes']), /two subset rows/);
  });
  it('caps the products at 50 and the waves at 50', async () => {
    await refused((wb) => { const w = sheet(wb, 'Products'); for (let i = 0; i < 50; i++) w.addRow([`extra${i}`, `E${i}`, '', 0, '', '', '']); }, /too many products \(54, limit 50\)/);
    await refused((wb) => { const w = sheet(wb, 'Waves'); for (let i = 0; i < 50; i++) w.addRow([`xw${i}`, `W${i}`, 0, '', 9]); }, /too many waves/);
  });
  it('caps the rows of a sheet (the workbook-wide limit applies to the new sheets too)', async () => {
    await refused((wb) => { sheet(wb, 'TeamIn').getRow(LIMITS.rows + 5).getCell(1).value = 'x'; }, /too many rows/);
  });
  it('refuses a foreign sheet named like ours', async () => {
    await refused((wb) => { sheet(wb, 'Products').getRow(1).getCell(1).value = 'Something else'; }, /unexpected header/);
  });
});

describe('teams: every row is validated', () => {
  it.each([
    ['unknown location', (r: XL.Row) => { r.getCell(4).value = 'Atlantis'; }, /unknown location "Atlantis"/],
    ['negative FTE', (r: XL.Row) => { r.getCell(5).value = -1; }, /FTE must be/],
    ['unknown skill', (r: XL.Row) => { r.getCell(2).value = 'Wizardry'; }, /unknown skill/],
    ['unknown grade', (r: XL.Row) => { r.getCell(3).value = 'Z9'; }, /unknown grade/],
    ['unknown pinned artefact', (r: XL.Row) => { r.getCell(6).value = 'no-such-artefact'; }, /unknown pinned artefact/],
  ])('refuses %s', async (_n, edit, msg) => { await refused((wb) => edit(sheet(wb, 'TeamIn').getRow(2)), msg); });
  it('refuses a product without a team row', async () => {
    await refused((wb) => { const w = sheet(wb, 'TeamIn'); w.eachRow((r, i) => { if (i > 1 && String(r.getCell(1).value) === ids[3]) r.getCell(1).value = ids[0]; }); }, /product ".*" has no team row/);
  });
});

describe('settings', () => {
  it.each([['Hub infrastructure allocation', 'cheapest', /allocation must be/], ['Horizon (months)', 500, /horizon must be/], ['Start date (ISO)', '31/12/2026', /start date must be/], ['Active product id', 'ghost', /unknown active product/]])('refuses %s', async (label, value, msg) => {
    await refused((wb) => sheet(wb, 'PortfolioSettings').eachRow((r) => { if (String(r.getCell(1).value) === label) r.getCell(2).value = value as never; }), msg);
  });
});

describe('long overrides are chunked, never truncated', () => {
  it('a value longer than a cell survives the round trip', async () => {
    const list = Array.from({ length: 700 }, (_, i) => `sdlc-artefact-${i}`);
    setProductOverride(ids[0]!, 'selectedArtefacts', list);
    const bytes = await base(), before = pfNow().products[0]!.overrides.selectedArtefacts;
    addProduct('Scratch');
    await importParamsWorkbook(asFile('long.xlsx', bytes), ENV);
    expect(pfNow().products[0]!.overrides.selectedArtefacts).toEqual(before);
    expect(JSON.stringify(list).length).toBeGreaterThan(8000);
  });
});
