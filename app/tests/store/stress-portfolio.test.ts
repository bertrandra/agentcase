import type * as XL from 'exceljs';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { setPortfolioRho } from '@/controllers/portfolio';
import { setProductOffset } from '@/controllers/product';
import { criticalReport } from '@/controllers/report';
import { portfolioSimParams, runPortfolioSimulation, setPortfolioSimParams } from '@/controllers/stressPortfolio';
import { pfDecision, pfStressFingerprint, portfolioMonteCarlo } from '@/domain/portfolio';
import { pfSimStore } from '@/store/portfolioSimulation';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { fourProducts, pfNow, regulatedPortfolio } from '../helpers/portfolioFixtures';
import { rows } from '../helpers/xlsxRows';

const NOW = new Date('2026-10-22T10:00:00Z');
beforeEach(() => { fourProducts(); pfSimStore.setState({ run: null, progress: null, params: null }); });
const book = async (): Promise<XL.Workbook> => {
  const out = await exportResultsWorkbook(undefined, NOW, { kind: 'portfolio' }), wb = new (await loadExcelJS()).Workbook();
  await wb.xlsx.load(await out.blob.arrayBuffer());
  return wb;
};

describe('runPortfolioSimulation', () => {
  it('stores the deterministic run of the live portfolio and its correlation, with progress that ends idle', async () => {
    setPortfolioRho(0.4);
    const seen: (number | null)[] = [];
    const off = pfSimStore.subscribe((s) => seen.push(s.progress));
    await runPortfolioSimulation({ draws: 150, seed: 9 });
    off();
    const run = pfSimStore.getState().run!, ref = portfolioMonteCarlo(pfNow(), { draws: 150, seed: 9, rho: 0.4 });
    expect(run.outcomes).toEqual(ref.outcomes);
    expect(run.rho).toBe(0.4);
    expect(run.fingerprint).toBe(pfStressFingerprint(pfNow()));
    expect(pfSimStore.getState().progress).toBeNull();
    expect(seen.filter((p) => p !== null).length).toBeGreaterThan(2);   // one step per planned product: the screen gets to breathe in between
  });
  it('a newer call supersedes a run in flight', async () => {
    const first = runPortfolioSimulation({ draws: 100, seed: 1 }), second = runPortfolioSimulation({ draws: 100, seed: 2 });
    await Promise.all([first, second]);
    expect(pfSimStore.getState().run!.seed).toBe(2);
  });
  it('draws and seed are clamped; the defaults are the active product\'s Monte Carlo inputs', () => {
    expect(portfolioSimParams()).toEqual({ draws: 1000, seed: 42 });
    expect(setPortfolioSimParams({ draws: 5 })).toEqual({ draws: 100, seed: 42 });
    expect(setPortfolioSimParams({ draws: 99999, seed: 0 })).toEqual({ draws: 5000, seed: 1 });
  });
  it('the run is stale as soon as a product moves (never silently outlives its portfolio)', async () => {
    await runPortfolioSimulation({ draws: 100, seed: 3 });
    const run = pfSimStore.getState().run!;
    expect(run.fingerprint).toBe(pfStressFingerprint(pfNow()));
    setProductOffset(pfNow().products[1]!.id, 3);
    expect(run.fingerprint).not.toBe(pfStressFingerprint(pfNow()));
    setPortfolioRho(0.2);
    expect(pfStressFingerprint(pfNow())).not.toBe(pfStressFingerprint({ ...pfNow(), rho: 0.9 }));
  });
});

describe('restitution of the run', () => {
  it('without a run the results workbook has no "Portfolio stress" sheet', async () => {
    expect((await book()).worksheets.map((w) => w.name)).not.toContain('Portfolio stress');
  });
  it('with a run it follows "Knowledge transfer" and carries the domain figures, staleness and verdicts', async () => {
    await runPortfolioSimulation({ draws: 150, seed: 5 });
    const run = pfSimStore.getState().run!, wb = await book(), names = wb.worksheets.map((w) => w.name), line = (l: string) => rows(wb, 'Portfolio stress').find((r) => r[0] === l) ?? [];
    expect(names.indexOf('Portfolio stress')).toBe(names.indexOf('Knowledge transfer') + 1);
    expect(line('Portfolio P10')[1]).toBe(run.stats.p10);
    expect(line('P(net benefit < 0)')[1]).toBe(run.stats.pNetNeg);
    expect(line('Correlation rho')[1]).toBe(run.rho);
    expect(line('Stale (portfolio changed since the run)')[1]).toBe('No');
    expect(line('Risk reduction (portfolio P10 - sum of product P10)')[1]).toBe(run.diversification.reduction);
    const verdict = rows(wb, 'Portfolio stress').find((r) => r[0] === 'Portfolio' && typeof r[2] === 'number' && r[1] !== undefined && typeof r[1] === 'string')!;
    expect(verdict[2]).toBe(pfDecision(pfNow(), run, { kind: 'portfolio' })!.confidence);
    expect(rows(wb, 'Portfolio stress').filter((r) => run.products.some((p) => p.name === r[0]))).toHaveLength(run.products.length);
    setProductOffset(pfNow().products[1]!.id, 3);
    expect(rows(await book(), 'Portfolio stress').find((r) => r[0] === 'Stale (portfolio changed since the run)')![1]).toBe('Yes');
  });
  it('the portfolio report gains a "Portfolio stress" section only when a run exists; a wave report speaks for its wave', async () => {
    regulatedPortfolio();
    const plain = criticalReport(NOW, { kind: 'portfolio' });
    expect(plain.ok && plain.html).not.toContain('Portfolio stress');
    await runPortfolioSimulation({ draws: 150, seed: 5 });
    const run = pfSimStore.getState().run!, r = criticalReport(NOW, { kind: 'portfolio' });
    if (!r.ok) throw new Error(r.reason);
    expect(r.html).toContain('7 · Portfolio stress');
    expect(r.html).toContain(`${run.draws} draws per product, seed ${run.seed}`);
    expect(r.html).toContain('Risk reduction against the products taken alone');
    const w = criticalReport(NOW, { kind: 'wave', id: pfNow().waves[1]!.id });
    if (w.ok) { expect(w.html).toContain('7 · Portfolio stress'); expect(w.html).not.toContain('Risk reduction against'); }
    const product = criticalReport(NOW, { kind: 'product' });
    expect(product.ok && product.html).not.toContain('Portfolio stress');
  });
});
