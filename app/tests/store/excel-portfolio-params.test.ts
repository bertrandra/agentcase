import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { addProduct } from '@/controllers/product';
import { consolidate, portfolioHeadline, type Portfolio } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { PORTFOLIO_SHEETS } from '@/store/persistence/excel/portfolio';
import { ENV } from '../helpers/excelParams';
import { fourProducts, openPortfolioFixture, pfNow } from '../helpers/portfolioFixtures';
import { freshStore } from './helpers';

type Scope = 'all' | 'no-factory' | 'persona-only';
const bytes = async (scope: Scope = 'all'): Promise<ArrayBuffer> => (await (await exportParamsWorkbook(scope, ENV)).blob.arrayBuffer());
const file = (b: ArrayBuffer) => ({ name: 'pf.xlsx', size: b.byteLength, arrayBuffer: async () => b });
const sheetNames = async (b: ArrayBuffer): Promise<string[]> => {
  const wb = new (await loadExcelJS()).Workbook();
  await wb.xlsx.load(b);
  return wb.worksheets.map((w) => w.name);
};
/** What a round trip must reproduce exactly: products, waves, hub, horizon, start date, knowledge subsets (inside the products), active product. */
const core = (p: Portfolio) => ({ products: p.products, waves: p.waves, hub: p.hub, horizonMonths: p.horizonMonths, startDate: p.startDate,
  active: p.activeProductId });
const npv = (p: Portfolio) => portfolioHeadline(consolidate(p)).npv;
/** The legacy-faithful rebuilds of the case import (see excel-params-roundtrip.test.ts NORMALISED): not compared, but stable (second test). */
const OMIT = ['phaseOff', 'PERSONAS', 'SECTION_DEPS'];
const rest = (c: Portfolio['common']) => Object.fromEntries(Object.entries(c).filter(([k]) => !OMIT.includes(k)));

describe.each([['pf-three-products fixture', () => openPortfolioFixture()],
  ['generated 4-product portfolio', () => fourProducts()]])('parameters workbook round trip: %s', (_n, make) => {
  it('export -> import into a fresh store reproduces the portfolio, in one undo step', async () => {
    const before = make(), b = await bytes();
    freshStore();
    const r = await importParamsWorkbook(file(b), ENV), after = pfNow();
    expect(r.changed).toEqual(['portfolio']);
    expect(core(after)).toEqual(core(before));
    expect(rest(after.common)).toEqual(rest(before.common));
    expect(npv(after)).toBeCloseTo(npv(before), 6);
    expect(appStore().getState().history.undo.map((h) => h.label)).toEqual(['Import portfolio parameters']);
    appStore().undo();
    expect(pfNow().products).toHaveLength(1);
    const viewed = pfNow().activeProductId;
    appStore().redo();
    // the active product is view state, never undone nor redone (lot 10): the redo brings the products back, the tab stays on the product it shows
    expect({ ...core(pfNow()), active: before.activeProductId }).toEqual(core(before));
    expect(pfNow().activeProductId).toBe(viewed);
  });
  it('is stable: a second export/import changes nothing, the three re-normalised keys included', async () => {
    make(); const b = await bytes();
    freshStore(); await importParamsWorkbook(file(b), ENV);
    const once = pfNow(), b2 = await bytes();
    freshStore(); await importParamsWorkbook(file(b2), ENV);
    expect(pfNow().common).toEqual(once.common);
    expect(core(pfNow())).toEqual(core(once));
  });
});

describe('scopes of the export', () => {
  it('"Export all" adds the nine portfolio sheets after the case sheets (Units and Owners: FX-30); the other scopes do not', async () => {
    fourProducts();
    const all = await sheetNames(await bytes('all'));
    expect(all.slice(-9)).toEqual(['PortfolioSettings', 'Products', 'Waves', 'TeamIn', 'Overrides', 'KnowledgeSubsets', 'KnowledgeDomains', 'Units', 'Owners']);
    expect(all.slice(0, -9).some((n) => PORTFOLIO_SHEETS.has(n))).toBe(false);
    for (const scope of ['no-factory',
      'persona-only'] as const) expect((await sheetNames(await bytes(scope))).filter((n) => PORTFOLIO_SHEETS.has(n))).toEqual([]);
    expect((await sheetNames(await bytes('no-factory'))).some((n) => /^FM /.test(n))).toBe(false);
  });
  it('a plain single case exports its 47 sheets and none of the portfolio ones', async () => {
    freshStore();
    const names = await sheetNames(await bytes('all'));
    expect(names).toHaveLength(47);
    expect(names.some((n) => PORTFOLIO_SHEETS.has(n))).toBe(false);
  });
  it('a case workbook (no Products sheet) still imports through the case path onto the active product', async () => {
    freshStore();
    const plain = await bytes('all');
    fourProducts(); addProduct('Extra');
    const r = await importParamsWorkbook(file(plain), ENV);
    expect(r.changed).not.toContain('portfolio');
    expect(pfNow().products.length).toBeGreaterThanOrEqual(5);
  });
});
