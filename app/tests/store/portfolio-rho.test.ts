import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { setPortfolioRho } from '@/controllers/portfolio';
import { buildPortfolioPackages, checkPortfolioStaleness, validate } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { ENV } from '../helpers/excelParams';
import { fourProducts, openPortfolioFixture, pfNow } from '../helpers/portfolioFixtures';
import { asFile, editXlsx } from '../helpers/xlsxEdit';
import { freshStore } from './helpers';

const undoLabels = () => appStore().getState().history.undo.map((h) => h.label);

describe('portfolio.setRho', () => {
  it('sets, validates in [0, 1], undoes and redoes; 0 is stored as absent', () => {
    openPortfolioFixture();
    expect(pfNow().rho).toBeUndefined();
    expect(setPortfolioRho(0.4)).toBe(true);
    expect(pfNow().rho).toBe(0.4);
    expect(undoLabels()).toEqual(['Set the correlation between products to 0.4']);
    for (const bad of [-0.1, 1.2, Number.NaN]) expect(setPortfolioRho(bad)).toBe(false);
    expect(pfNow().rho).toBe(0.4);
    expect(setPortfolioRho(0)).toBe(true);
    expect('rho' in pfNow()).toBe(false);
    // consecutive edits of the slider are one undo step
    appStore().undo(); expect(pfNow().rho).toBeUndefined();
    appStore().redo(); expect('rho' in pfNow()).toBe(false);
    expect(setPortfolioRho(0.7)).toBe(true);
    expect(pfNow().rho).toBe(0.7);
  });
  it('the validator refuses a rho out of range', () => {
    const pf = openPortfolioFixture();
    expect(validate({ ...pf, rho: 0.5 }).errors).toEqual([]);
    expect(validate({ ...pf, rho: 1.5 }).errors.map((e) => e.code)).toContain('rho');
  });
});

describe('persistence of rho', () => {
  it('a snapshot keeps it, and a single case with a correlation is still saved as a portfolio', () => {
    openPortfolioFixture(); setPortfolioRho(0.35);
    expect(openSnapshot(toPortfolioSnapshot(pfNow())).rho).toBe(0.35);
    freshStore();
    setPortfolioRho(0.2);
    const snap = toPortfolioSnapshot(pfNow());
    expect(snap._schema).toBe('agentcase.portfolio.v1');
    expect(openSnapshot(snap).rho).toBe(0.2);
  });
  it('a snapshot without rho opens at 0 (absent), and a hostile value is corrected to 0 with a note', () => {
    openPortfolioFixture();
    const snap = toPortfolioSnapshot(pfNow());
    expect('rho' in openSnapshot(snap)).toBe(false);
    for (const rho of [7, 'x']) {
      const { portfolio, notes } = openChecked({ ...snap, rho });
      expect('rho' in portfolio).toBe(false);
      expect(notes).toEqual([expect.stringMatching(/correlation rho .* not in \[0, 1\]/)]);
    }
  });
  it('the PortfolioSettings sheet round trips it; a workbook without the row means 0', async () => {
    fourProducts(); setPortfolioRho(0.6);
    const bytes = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    freshStore(); await importParamsWorkbook(asFile('a.xlsx', bytes), ENV);
    expect(pfNow().rho).toBe(0.6);
    const without = await editXlsx(bytes, (wb) => {
      const ws = wb.getWorksheet('PortfolioSettings')!;
      ws.eachRow((r, i) => { if (String(r.getCell(1).value).startsWith('Correlation rho')) ws.spliceRows(i, 1); });
    });
    setPortfolioRho(0.9);
    await importParamsWorkbook(asFile('b.xlsx', without), ENV);
    expect(pfNow().rho).toBeUndefined();
  });
  it('the sheet refuses a correlation out of [0, 1]', async () => {
    fourProducts();
    const bytes = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    const bad = await editXlsx(bytes,
      (wb) => { wb.getWorksheet('PortfolioSettings')!.eachRow(
      (r) => { if (String(r.getCell(1).value).startsWith('Correlation rho')) r.getCell(2).value = 1.5; }); });
    await expect(importParamsWorkbook(asFile('c.xlsx', bad), ENV)).rejects.toThrow(/correlation rho/i);
  });
});

describe('staleness package', () => {
  it('rho moves the portfolio package (stale) and leaves the product packages alone; rho = 0 keeps the historic hash', () => {
    const pf = openPortfolioFixture(), before = buildPortfolioPackages(pf);
    expect(buildPortfolioPackages({ ...pf, rho: 0 }).calculationPackage.inputHash).toBe(before.calculationPackage.inputHash);
    const moved = { ...pf, rho: 0.5 }, after = buildPortfolioPackages(moved);
    expect(after.calculationPackage.inputHash).not.toBe(before.calculationPackage.inputHash);
    expect(after.calculationPackages).toEqual(before.calculationPackages);
    expect(checkPortfolioStaleness(before.calculationPackage, before.calculationPackages, pf).state).toBe('valid');
    expect(checkPortfolioStaleness(before.calculationPackage, before.calculationPackages, moved).state).toBe('stale');
  });
});
