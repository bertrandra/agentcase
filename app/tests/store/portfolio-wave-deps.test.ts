import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { removeWave } from '@/controllers/wave';
import { setMaxConcurrentSetups, setWaveDependency } from '@/controllers/waveDeps';
import { buildPortfolioPackages, consolidate } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { freshStore } from './helpers';
import { asFile, editXlsx } from '../helpers/xlsxEdit';
import { openPortfolioFixture, pfNow } from '../helpers/portfolioFixtures';
import { ENV } from '../helpers/excelParams';

const W1 = 'w1', W2 = 'wdr3dpo', DEP = { waveId: W1, milestone: 'setupEnd' as const, lagMonths: 1 };
const undoLabels = (): string[] => appStore().getState().history.undo.map((entry) => entry.label);
const month0 = (id: string) => consolidate(pfNow()).products.find((v) => v.id === id)!.month0;

describe('wave.setDependency', () => {
  it('sets, edits the lag in one step, clears, undoes and redoes; the consolidation follows', () => {
    openPortfolioFixture();
    expect(month0('p299ec9')).toBe(6);
    expect(setWaveDependency(W2, DEP)).toBe(true);
    const moved = month0('p299ec9');
    expect(moved).toBeGreaterThan(6);
    expect(setWaveDependency(W2, { ...DEP, lagMonths: 3 })).toBe(true);
    expect(month0('p299ec9')).toBe(moved + 2);
    expect(undoLabels()).toEqual(['Set wave dependency']);
    expect(setWaveDependency(W2, null)).toBe(true);
    expect(pfNow().waves[1]).not.toHaveProperty('dependsOn');
    expect(month0('p299ec9')).toBe(6);
    appStore().undo(); expect(pfNow().waves[1]!.dependsOn).toEqual({ ...DEP, lagMonths: 3 });
    appStore().undo(); expect(pfNow().waves[1]).not.toHaveProperty('dependsOn');
    appStore().redo(); expect(pfNow().waves[1]!.dependsOn?.lagMonths).toBe(3);
  });
  it('refuses itself, an unknown wave and a cycle (nothing changes)', () => {
    openPortfolioFixture();
    expect(setWaveDependency(W2, { ...DEP, waveId: W2 })).toBe(false);
    expect(setWaveDependency(W2, { ...DEP, waveId: 'nope' })).toBe(false);
    expect(setWaveDependency(W2, DEP)).toBe(true);
    expect(setWaveDependency(W1, { ...DEP, waveId: W2 })).toBe(false);
    expect(undoLabels()).toHaveLength(1);
  });
  it('removing the wave it depends on clears it, and undo brings both back', () => {
    openPortfolioFixture(); setWaveDependency(W2, DEP);
    removeWave(W1);
    expect(pfNow().waves[0]).not.toHaveProperty('dependsOn');
    appStore().undo(); expect(pfNow().waves[1]!.dependsOn).toEqual(DEP);
  });
});

describe('portfolio.setMaxConcurrentSetups', () => {
  it('sets, pushes setups back, clears with 0, undoes and redoes', () => {
    openPortfolioFixture();
    expect(setMaxConcurrentSetups(1)).toBe(true);
    expect(pfNow().maxConcurrentSetups).toBe(1);
    expect(month0('pq5uoye')).toBeGreaterThan(2);
    expect(undoLabels()).toEqual(['Allow at most 1 product(s) in setup at the same time']);
    expect(setMaxConcurrentSetups(-2)).toBe(false);
    expect(setMaxConcurrentSetups(0)).toBe(true);
    expect('maxConcurrentSetups' in pfNow()).toBe(false);
    expect(month0('pq5uoye')).toBe(2);
    appStore().undo(); expect(pfNow().maxConcurrentSetups).toBeUndefined();
    appStore().redo(); expect('maxConcurrentSetups' in pfNow()).toBe(false);
  });
  it('a capacity or a dependency moves the portfolio package; none keeps the historic hash', () => {
    const pf = openPortfolioFixture(), before = buildPortfolioPackages(pf).calculationPackage.inputHash;
    setMaxConcurrentSetups(1);
    expect(buildPortfolioPackages(pfNow()).calculationPackage.inputHash).not.toBe(before);
    setMaxConcurrentSetups(0);
    expect(buildPortfolioPackages(pfNow()).calculationPackage.inputHash).toBe(before);
  });
});

describe('persistence', () => {
  it('a snapshot keeps the dependency and the capacity; hostile values are dropped with a note', () => {
    openPortfolioFixture(); setWaveDependency(W2, DEP); setMaxConcurrentSetups(2);
    const snap = toPortfolioSnapshot(pfNow()), back = openSnapshot(snap);
    expect(back.waves[1]!.dependsOn).toEqual(DEP); expect(back.maxConcurrentSetups).toBe(2);
    const waves = (snap.waves as Record<string, unknown>[]).map((w, i) => (i === 1 ? { ...w, dependsOn: { waveId: 'ghost', milestone: 'start', lagMonths: 0 } } : w));
    const { portfolio, notes } = openChecked({ ...snap, waves, maxConcurrentSetups: 'x' });
    expect(portfolio.waves[1]).not.toHaveProperty('dependsOn'); expect('maxConcurrentSetups' in portfolio).toBe(false);
    expect(notes).toEqual([expect.stringMatching(/dependency .* not valid — dropped/), expect.stringMatching(/setup capacity "x"/)]);
  });
  it('the parameters workbook round trips both; a bad milestone or an unknown wave is refused', async () => {
    openPortfolioFixture(); setWaveDependency(W2, DEP); setMaxConcurrentSetups(2);
    const bytes = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    freshStore(); await importParamsWorkbook(asFile('a.xlsx', bytes), ENV);
    expect(pfNow().waves.find((w) => w.id === W2)!.dependsOn).toEqual(DEP); expect(pfNow().maxConcurrentSetups).toBe(2);
    const edit = (col: number, v: string) => editXlsx(bytes, (wb) => { wb.getWorksheet('Waves')!.getRow(3).getCell(col).value = v; });
    await expect(importParamsWorkbook(asFile('b.xlsx', await edit(7, 'later')), ENV)).rejects.toThrow(/milestone must be start or setupEnd/);
    await expect(importParamsWorkbook(asFile('c.xlsx', await edit(6, 'ghost')), ENV)).rejects.toThrow(/depends on unknown wave/);
  });
});
