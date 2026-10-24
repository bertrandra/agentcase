import type * as XL from 'exceljs';
import { describe, expect, it } from 'vitest';
import { exportCostModel } from '@/controllers/excelCostModel';
import { renameProduct } from '@/controllers/product';
import { consolidate, corePortfolio, type CostScope } from '@/domain/portfolio';
import { appVerFileTag } from '@/domain/snapshots';
import { APP_VERSION } from '@/domain/version';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { fourProducts, pfNow } from '../helpers/portfolioFixtures';
import { freshStore } from './helpers';

const NOW = new Date('2026-10-22T10:30:00Z');
const HDR = 10, FIRST = 11;
async function read(scope: CostScope = { kind: 'portfolio' }): Promise<{ wb: XL.Workbook; filename: string }> {
  const out = await exportCostModel(scope, NOW), wb = new (await loadExcelJS()).Workbook();
  await wb.xlsx.load(await out.blob.arrayBuffer());
  return { wb, filename: out.filename };
}
/** A formula cell reads as its cached result (ExcelJS drops a result of exactly 0 on load: read it as 0). */
const val = (ws: XL.Worksheet, r: number, c: number): unknown => { const v = ws.getCell(r, c).value; return v && typeof v === 'object' && 'formula' in v ? ((v as { result?: unknown }).result ?? 0) : v; };
const heads = (ws: XL.Worksheet): unknown[] => Array.from({ length: ws.columnCount }, (_, i) => val(ws, HDR, i + 1)).filter((x) => x !== null && x !== undefined);
/** Data rows of the monthly table: from FIRST until the first empty key cell. */
const table = (ws: XL.Worksheet): number[] => { const out: number[] = []; for (let r = FIRST; val(ws, r, 1); r++) out.push(r); return out; };
const col = (ws: XL.Worksheet, name: string): number => (heads(ws) as string[]).indexOf(name) + 1;

describe('the cost-model workbook', () => {
  it('has exactly the three sheets, in order, with the header block and the column layout', async () => {
    const pf = fourProducts(), { wb, filename } = await read(), L = consolidate(corePortfolio(pf)).horizon;
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Values', 'Rate cards', 'Other costs']);
    expect(filename).toBe(`AgentCase_${appVerFileTag()}_CostModel_Portfolio_2026-10-22-10-30-00.xlsx`);
    for (const ws of wb.worksheets) {
      expect(String(val(ws, 1, 1))).toContain('AgentCase cost model (monthly)');
      expect(['Scope', 'Generated (UTC)', 'App version', 'Currency', 'Convention', 'How to recompute', 'Not exported'].map((_, i) => val(ws, 2 + i, 1))).toEqual(['Scope', 'Generated (UTC)', 'App version', 'Currency', 'Convention', 'How to recompute', 'Not exported']);
      expect(val(ws, 2, 3)).toBe('Portfolio'); expect(val(ws, 3, 3)).toBe('2026-10-22 10:30:00'); expect(val(ws, 4, 3)).toBe(`v${APP_VERSION}`); expect(val(ws, 5, 3)).toBe('EUR');
      expect(String(val(ws, 6, 3))).toMatch(/M1 = first portfolio month/); expect(String(val(ws, 8, 3))).toContain('Archive (no wave)');
      const h = heads(ws);
      expect(h.slice(0, 3)).toEqual(['Portfolio', 'Wave', 'Product']);
      expect(h.slice(7, 9)).toEqual(['Unit', 't0']); expect(h[9]).toBe('M1'); expect(h[8 + L]).toBe(`M${L}`); expect(h[9 + L]).toBe('Total'); expect(h.length).toBe(10 + L);
      expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: HDR });
      expect(ws.autoFilter).toBeTruthy();
    }
    const values = wb.getWorksheet('Values')!;
    expect(heads(values).slice(3, 7)).toEqual(['Group', 'Skill', 'Grade', 'Location']);
  });
  it('Values: t0 filled, months before a product starts are empty, subtotals are formulas', async () => {
    fourProducts();
    const { wb } = await read(), ws = wb.getWorksheet('Values')!, rows = table(ws);
    const payroll = rows.filter((r) => val(ws, r, 3) === 'Payroll' && val(ws, r, 4) === 'Human days');
    expect(payroll.length).toBeGreaterThan(0);
    const t0 = col(ws, 't0'), m1 = col(ws, 'M1'), m3 = col(ws, 'M3');
    for (const r of payroll) { expect(typeof val(ws, r, t0)).toBe('number'); expect(ws.getCell(r, m1).value).toBeNull(); expect(ws.getCell(r, m1 + 1).value).toBeNull(); expect(typeof val(ws, r, m3)).toBe('number'); }
    const billing = rows.filter((r) => val(ws, r, 3) === 'Billing' && val(ws, r, 4) === 'Human days');
    for (const r of billing) expect(ws.getCell(r, m1 + 5).value).toBeNull();
    const sub = rows.find((r) => val(ws, r, 3) === 'Payroll' && val(ws, r, 4) === 'Subtotal')!;
    expect(ws.getCell(sub, m3).value).toMatchObject({ formula: expect.stringMatching(/^SUM\(/) });
    const total = rows.find((r) => val(ws, r, 5) === 'Portfolio total (human days)')!;
    expect((ws.getCell(total, m3).value as { formula: string }).formula).toMatch(/^SUM\(/);
    const sumDays = (c: number) => payroll.reduce((s, r) => s + (Number(val(ws, r, c)) || 0), 0);
    expect(val(ws, sub, m3)).toBeCloseTo(sumDays(m3), 8);
    expect(rows.some((r) => val(ws, r, 4) === 'Drivers (non-cost)' && val(ws, r, 5) === 'Adoption')).toBe(true);
    expect(rows.some((r) => val(ws, r, 5) === 'Agent (vFTE)' && val(ws, r, 8) === 'agent vFTE-days')).toBe(true);
    expect(pfNow().products.length).toBe(4);
  });
  it('Rate cards: the RATE table, blended rates, the applied-rate block and a zero team-cost check', async () => {
    const pf = fourProducts(), { wb } = await read(), ws = wb.getWorksheet('Rate cards')!, rows = table(ws);
    const rate = pf.common.RATE, start = rows[rows.length - 1]! + 1;
    let at = 0;
    for (let r = start; r < start + 60 && !at; r++) if (val(ws, r, 1) === 'Location' && val(ws, r, 2) === 'Class') at = r;
    expect(at).toBeGreaterThan(0);
    const bands = ['A', 'B', 'C', 'D', 'F'];
    for (let r = at + 1; val(ws, r, 1); r++) bands.forEach((b, i) => expect(val(ws, r, 3 + i)).toBe(rate[String(val(ws, r, 1))]![b]));
    const adj = rows.find((r) => val(ws, r, 5) === 'Blending adjustment (target location mix)')!;
    expect(ws.getCell(adj, col(ws, 'M5')).value).toMatchObject({ formula: expect.stringMatching(/^Values!.*\*\$F\$/) });
    const dot = rows.find((r) => String(val(ws, r, 5)).startsWith('Team cost ='))!;
    expect((ws.getCell(dot, col(ws, 'M5')).value as { formula: string }).formula).toMatch(/^SUMPRODUCT\(Values!/);
    for (const r of rows.filter((x) => val(ws, x, 5) === 'Difference (must be 0)')) for (let c = col(ws, 't0'); c <= col(ws, 'Total'); c++) expect(Math.abs(Number(val(ws, r, c)) || 0)).toBeLessThan(1e-6);
  });
  it('Other costs: setup, KT, Knowledge Hub, pilot, tokens, infrastructure, totals and the parameters block', async () => {
    fourProducts();
    const { wb } = await read(), ws = wb.getWorksheet('Other costs')!, rows = table(ws), lines = new Set(rows.map((r) => String(val(ws, r, 5))));
    for (const l of ['Tokens', 'Infrastructure', 'Knowledge Hub curation', 'Knowledge Hub infrastructure (allocated)', 'Setup: Knowledge Hub and knowledge transfer (KT)',
      'Setup: tooling, training, coaching, governance', 'Agentic run team (AgentOps)', 'Knowledge transfer avoided', 'Verification tax',
      'Pilot (indicative sizing, not in the engine cost)', 'TOTAL TO-BE COST (days x rate + other costs)', 'PORTFOLIO TOTAL TO-BE COST']) expect(lines.has(l), l).toBe(true);
    const team = rows.find((r) => val(ws, r, 5) === 'Team cost (human days x applied rate)')!;
    expect((ws.getCell(team, col(ws, 'M3')).value as { formula: string }).formula).toMatch(/^'Rate cards'!/);
    let p = 0;
    for (let r = rows[rows.length - 1]!; r < rows[rows.length - 1]! + 10 && !p; r++) if (val(ws, r, 5) === 'Parameter') p = r + 1;
    expect(val(ws, p, 5)).toBe('Annual discount rate'); expect(val(ws, p, 6)).toBe(0.08); expect(String(val(ws, p, 8))).toBe('Engagement context');
    const factor = rows.find((r) => val(ws, r, 5) === 'Monthly discount factor')!;
    expect((ws.getCell(factor, col(ws, 'M3')).value as { formula: string }).formula).toBe(`1/(1+$F$${p}/12)^3`);
    expect(val(ws, factor, col(ws, 'M3'))).toBeCloseTo(1 / Math.pow(1 + 0.08 / 12, 3), 12);
    const total = rows.find((r) => val(ws, r, 5) === 'PORTFOLIO TOTAL TO-BE COST')!, eng = total + 1, diff = total + 2;
    expect(String(val(ws, eng, 5))).toContain('engine total'); expect(Math.abs(Number(val(ws, diff, col(ws, 'M7'))))).toBeLessThan(1e-6);
  });
  it('scopes: portfolio, wave and product cover only their products; a single case carries the default names', async () => {
    const pf = fourProducts(), w2 = pf.waves[1]!, all = table((await read()).wb.getWorksheet('Values')!).length;
    const wave = (await read({ kind: 'wave', id: w2.id })).wb.getWorksheet('Values')!, prod = await read({ kind: 'product', id: pf.products[1]!.id });
    const names = (ws: XL.Worksheet) => new Set(table(ws).map((r) => val(ws, r, 3)).filter((x) => x !== '(all products)'));
    expect(names(wave)).toEqual(new Set(['Billing'])); expect(table(wave).length).toBeLessThan(all);
    expect(names(prod.wb.getWorksheet('Values')!)).toEqual(new Set(['Payroll']));
    expect(prod.filename).toMatch(new RegExp(String.raw`^AgentCase_${appVerFileTag()}_CostModel_Product_Payroll_`)); expect((await read({ kind: 'wave', id: w2.id })).filename).toMatch(/CostModel_Wave_Wave_2_/);
    expect(val(prod.wb.getWorksheet('Values')!, 8, 3)).toBe('None: every product of the scope is planned');
    freshStore();
    const single = (await read()).wb.getWorksheet('Values')!, one = table(single);
    expect(new Set(one.map((r) => val(single, r, 3)).filter((x) => x !== '(all products)'))).toEqual(new Set(['Product 1']));
    expect(new Set(one.map((r) => val(single, r, 2)).filter((x) => x !== '(all waves)'))).toEqual(new Set(['Wave 1']));
    await expect(exportCostModel({ kind: 'product', id: 'nope' })).rejects.toThrow(/not planned/);
  });
  it('a name typed by a user can never become a formula', async () => {
    freshStore();
    renameProduct(pfNow().products[0]!.id, '=HYPERLINK("http://x","y")');
    const ws = (await read()).wb.getWorksheet('Other costs')!, v = ws.getCell(FIRST, 3).value;
    expect(typeof v).toBe('string'); expect(String(v).startsWith("'=")).toBe(true);
  });
});
