import type * as XL from 'exceljs';
import { describe, expect, it } from 'vitest';
import { exportDdPack } from '@/controllers/excelDd';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { renameProduct, addProduct, setActiveProduct } from '@/controllers/product';
import { makeCtx } from '@/domain';
import { consolidate, consolidationView, corePortfolio, knowledgeTable, portfolioHeadline, resolveProduct, waveEffects, type DisplayScope } from '@/domain/portfolio';
import { fmtRoiPct } from '@/domain/economics';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData } from '@/store/persistence/excel/results';
import { sheetName } from '@/store/persistence/excel/results/portfolio';
import { fourProducts, pfNow } from '../helpers/portfolioFixtures';
import { freshStore } from './helpers';

const NOW = new Date('2026-10-22T10:00:00Z');
async function read(scope?: DisplayScope): Promise<XL.Workbook> {
  const out = await exportResultsWorkbook(undefined, NOW, scope), wb = new (await loadExcelJS()).Workbook();
  await wb.xlsx.load(await out.blob.arrayBuffer());
  return wb;
}
/** The rows of a sheet as plain values (row 1 included), blank rows kept. */
const rows = (wb: XL.Workbook, name: string): unknown[][] => {
  const out: unknown[][] = [];
  wb.getWorksheet(name)!.eachRow({ includeEmpty: true }, (r) => { out.push((r.values as unknown[]).slice(1)); });
  return out;
};
const names = (wb: XL.Workbook): string[] => wb.worksheets.map((w) => w.name);
/** The cells of the line that starts with `label` in column A. */
const line = (wb: XL.Workbook, sheet: string, label: string): unknown[] => rows(wb, sheet).find((r) => r[0] === label) ?? [];

describe('the results workbook of a portfolio', () => {
  it('has Portfolio, a sheet per wave, Knowledge transfer and, per product, a summary plus its six results sheets', async () => {
    const pf = fourProducts(), wb = await read({ kind: 'portfolio' });
    expect(names(wb)).toEqual([
      'Portfolio', 'Wave Wave 1', 'Wave Wave 2', 'Knowledge transfer',
      ...pf.products.flatMap((p, i) => [`Product ${p.name}`, ...['ROI', 'Investment', 'Operating costs', 'Savings', 'P&L', 'Workforce shift'].map((k) => `P${i + 1} ${k}`)]),
    ].map((n) => (n.length > 31 ? n.slice(0, 31) : n)));
  });
  it('the display scope decides which group leads; all sheets are always exported', async () => {
    const pf = fourProducts(), all = names(await read({ kind: 'portfolio' })).slice().sort();
    const w2 = pf.waves[1]!.id;
    const wave = await read({ kind: 'wave', id: w2 }), prod = await read({ kind: 'product' });
    expect(names(wave)[0]).toBe('Wave Wave 2');
    expect(names(wave).slice().sort()).toEqual(all);
    expect(names(prod)[0]).toBe(`Product ${pf.products[0]!.name}`);
    expect(names(prod).slice().sort()).toEqual(all);
  });
  it('Portfolio: the cards and the total lines equal portfolioHeadline / consolidationView', async () => {
    const pf = fourProducts(), core = corePortfolio(pf), c = consolidate(core), h = portfolioHeadline(c), view = consolidationView(core, c), wb = await read();
    expect(line(wb, 'Portfolio', 'NPV, calendar (EUR)')[1]).toBe(h.npv);
    expect(line(wb, 'Portfolio', 'Setup investment')[1]).toBe(h.setup);
    expect(line(wb, 'Portfolio', 'Net (benefits - setup)')[1]).toBe(h.net);
    expect(line(wb, 'Portfolio', 'Total benefits')[1]).toBe(h.totalBenefit);
    expect(line(wb, 'Portfolio', 'ROI (3 years)')[1]).toBe(fmtRoiPct(h.roi));
    expect(line(wb, 'Portfolio', 'Payback (calendar month)')[1]).toBe(h.paybackMonth ?? `>${c.horizon}`);
    expect(line(wb, 'Portfolio', 'Planned products')[1]).toBe(h.products);
    // by year / by wave / by product, cell by cell, and the total line is the headline
    view.years.forEach((y) => expect(line(wb, 'Portfolio', y.label).slice(0, 5)).toEqual([y.label, y.savings, y.run, y.setup, y.net]));
    view.waves.forEach((w) => expect(line(wb, 'Portfolio', w.name).slice(0, 9)).toEqual([w.name, w.products, w.npv, w.net, w.setup, w.savings, w.run, w.etp, w.vfte]));
    view.products.forEach((p) => expect(line(wb, 'Portfolio', p.name).slice(0, 4)).toEqual([p.name, 1, p.npv, p.net]));
    expect(line(wb, 'Portfolio', 'Portfolio').filter((x) => typeof x === 'number')).toContain(view.totals.npv);
    expect(view.totals.npv).toBe(h.npv);
    expect(line(wb, 'Portfolio', 'Portfolio')).toBeTruthy();
    expect(view.excluded.length).toBeGreaterThan(0);
    view.excluded.forEach((e) => expect(line(wb, 'Portfolio', e.name)[1]).toBe('no wave'));
  });
  it('Wave sheets: the cumulative cash by month is the wave series of the consolidation', async () => {
    const pf = fourProducts(), c = consolidate(corePortfolio(pf)), wb = await read();
    c.waves.forEach((w) => {
      const tbl = rows(wb, `Wave ${w.name}`), at = tbl.findIndex((r) => r[0] === 'Month');
      const body = tbl.slice(at + 1, at + 1 + c.horizon);
      expect(body.map((r) => r[6])).toEqual(w.summary.cum);
      expect(body.map((r) => r[5])).toEqual(w.series.net);
      expect(line(wb, `Wave ${w.name}`, 'NPV, calendar (EUR)')[1]).toBe(w.summary.npv);
    });
  });
  it('Product summaries show the calendar NPV and the NPV from the product’s own start', async () => {
    const pf = fourProducts(), c = consolidate(corePortfolio(pf)), wb = await read();
    for (const v of c.products) {
      expect(line(wb, `Product ${v.name}`, 'NPV, calendar (EUR)')[1]).toBe(v.summary.npv);
      expect(line(wb, `Product ${v.name}`, 'NPV from its own start (EUR)')[1]).toBe(v.run.headline().npv);
    }
    expect(line(wb, 'Product Archive (no wave)', 'Wave')[1]).toBe('Not scheduled');
  });
  it('a product’s own results sheets are today’s results workbook of its effective case', async () => {
    const pf = fourProducts(), wb = await read(), xl = await loadExcelJS();
    for (const [i, p] of pf.products.entries()) {
      const legacy = buildResultsWorkbook(xl, resultsData(makeCtx(resolveProduct(pf, p.id))));
      for (const k of ['ROI', 'Investment', 'Operating costs', 'Savings', 'P&L', 'Workforce shift']) expect(rows(wb, `P${i + 1} ${k}`)).toEqual(rows(legacy, k));
    }
  });
  it('Knowledge transfer equals knowledgeTable and the wave effects', async () => {
    const pf = fourProducts(), kt = knowledgeTable(pf), wb = await read();
    kt.rows.forEach((r) => expect(line(wb, 'Knowledge transfer', r.name).slice(9, 14)).toEqual([r.setup, r.annual, r.ktDays, r.ktAvoided, r.hubDeltaSav]));
    expect(line(wb, 'Knowledge transfer', 'Total').slice(9, 14)).toEqual([kt.totals.setup, kt.totals.annual, kt.totals.ktDays, kt.totals.ktAvoided, kt.totals.hubDeltaSav]);
    waveEffects(pf, kt.rows).forEach((w) => expect(line(wb, 'Knowledge transfer', w.name).slice(1, 7)).toEqual([w.products, w.users, w.setup, w.annual, w.ktAvoided, w.hubDeltaSav]));
    expect(line(wb, 'Knowledge transfer', 'Conserved')[1]).toBe('Yes');
  });
  it('a plain single case still exports the six legacy sheets, nothing else', async () => {
    freshStore();
    expect(names(await read())).toEqual(['ROI', 'Investment', 'Operating costs', 'Savings', 'P&L', 'Workforce shift']);
  });
});

describe('Excel-safe sheet names', () => {
  it('limits to 31 characters, drops []:*?/\\ and apostrophes at the ends, stays unique case-insensitively', () => {
    const used = new Set<string>();
    const got = ['Wave A very long wave name that exceeds the limit', "'quoted'", 'Pr[o]d:uct*?/\\', 'Same', 'SAME', 'same', '', 'History'].map((n) => sheetName(n, used));
    expect(got.every((n) => n.length > 0 && n.length <= 31 && !/[[\]:*?/\\]/.test(n) && !/^'|'$/.test(n))).toBe(true);
    expect(new Set(got.map((n) => n.toLowerCase())).size).toBe(got.length);
    expect(got[0]).toBe('Wave A very long wave name that');
  });
  it('two products with the same long name get distinct sheets', async () => {
    const pf0 = fourProducts(), first = pf0.products[0]!.id, long = 'Core banking platform – payments hub';
    renameProduct(first, long); addProduct(long);
    const wb = await read(), n = names(wb);
    expect(new Set(n.map((x) => x.toLowerCase())).size).toBe(n.length);
    expect(n.every((x) => x.length <= 31)).toBe(true);
    expect(pfNow().products.length).toBe(5);
  });
});

describe('due-diligence pack of a portfolio', () => {
  const pack = async () => {
    const out = await exportDdPack((id) => id, NOW), wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(await out.blob.arrayBuffer());
    return wb;
  };
  it('is the ACTIVE product’s pack (annotations are common to the portfolio), named on DD_Coverage', async () => {
    const pf = fourProducts();
    let wb = await pack();
    expect(names(wb)).toEqual(['DD_Register', 'DD_Coefficients', 'DD_Evidence_Requests', 'DD_Coverage']);
    expect(line(wb, 'DD_Coverage', 'Product (effective case of this pack)')[1]).toBe(pf.products[0]!.name);
    setActiveProduct(pf.products[1]!.id);
    wb = await pack();
    expect(line(wb, 'DD_Coverage', 'Product (effective case of this pack)')[1]).toBe(pf.products[1]!.name);
  });
  it('a plain case has no product line (the pack is unchanged)', async () => {
    freshStore();
    expect(line(await pack(), 'DD_Coverage', 'Product (effective case of this pack)')).toEqual([]);
  });
});
