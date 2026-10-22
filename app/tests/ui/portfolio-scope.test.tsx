// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTeamTotal } from '@/controllers/baseline';
import { removeWave } from '@/controllers/wave';
import { exportSnapshotJson } from '@/controllers/files';
import { computeCase } from '@/domain';
import { consolidate, portfolioHeadline, productMonth0, resolveProduct, runOf, waveHeadline } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { fmtEurK, fmtMonths, fmtPct } from '@/ui/format';
import { kpi, mountApp, pf } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';
import { expectClose } from '../helpers/portfolio';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const select = () => screen.getByRole('combobox', { name: "Périmètre d'affichage" }) as HTMLSelectElement;
const choose = (v: string) => fireEvent.change(select(), { target: { value: v } });
const savings = () => kpi(/^Savings Y/), run = () => kpi(/^Run cost Y/), payback = () => kpi(/^Payback$/), eff = () => kpi(/^Effective automation$/), ceil = () => kpi(/^Glass ceiling$/);

describe('display scope selector (F17)', () => {
  it('offers Portefeuille, each Vague and each Produit; defaults to the active product', () => {
    mountApp();
    expect([...select().options].map((o) => o.textContent)).toEqual([
      'Portefeuille', 'Vague : Vague 1', 'Vague : Wave 2', 'Produit : Produit 1 (actif)', 'Produit : B', 'Produit : C']);
    expect(select().value).toBe(`product:${ids[0]}`);
    expect(screen.getByRole('complementary', { name: 'Headline results' })).toBeTruthy();
  });

  it('Produit scope is today\'s behaviour: the figures of computeCase of the active product', () => {
    mountApp();
    const r = computeCase(resolveProduct(pf(), ids[0]));
    expect(savings()).toBe(fmtEurK(r.endYear.savings));
    expect(run()).toBe(fmtEurK(r.endYear.run));
    expect(payback()).toBe(fmtMonths(r.payback));
    expect(eff()).toBe(fmtPct(r.model.eff));
    expect(ceil()).toBe(fmtPct(r.model.ceiling));
  });

  it('Portefeuille: the figures are the domain headline, and the sum of the products shifted to their start (1e-9)', () => {
    mountApp();
    choose('portfolio');
    const c = consolidate(pf()), h = portfolioHeadline(c), L = c.horizon, first = Math.floor((L - 1) / 12) * 12;
    expect(screen.getByRole('complementary', { name: 'Headline results — Portefeuille' })).toBeTruthy();
    expect(kpi(/^Périmètre$/)).toBe('Portefeuille');
    // independent derivation: each product's own Time Engine rows shifted by wave start + offset, summed over the last calendar year
    let sav = 0, runCost = 0;
    for (const p of pf().products) {
      const w = pf().waves.find((x) => x.id === p.waveId)!, m0 = productMonth0(w, p), rows = runOf(resolveProduct(pf(), p.id)).rows;
      rows.forEach((row, i) => { const T = m0 + i; if (T >= first && T < L) { sav += row.grossSavings; runCost += row.totalRunCost; } });
    }
    expectClose(h.endYear.savings, sav); expectClose(h.endYear.run, runCost);
    expect(savings()).toBe(fmtEurK(sav));
    expect(run()).toBe(fmtEurK(runCost));
    expect(payback()).toBe(fmtMonths(h.paybackMonth));
    expect(eff()).toBe(fmtPct(h.eff));
    expect(ceil()).toBe(fmtPct(h.ceiling));
    expect(kpi(/^Velocity Y/)).toBe(`${h.velocityPct >= 0 ? '+' : ''}${Math.round(h.velocityPct)}%`);
    expect(screen.getByText(/^Savings Y/).parentElement!.title).toContain('Portefeuille');
    expect(screen.getByRole('status').textContent).toContain('Périmètre d’affichage : Portefeuille');
  });

  it('Vague: the figures of that wave only; the label and the tooltips name it', () => {
    mountApp();
    choose(`wave:${waves[1]}`);
    const c = consolidate(pf()), h = waveHeadline(c, waves[1])!;
    expect(screen.getByRole('complementary', { name: 'Headline results — Wave 2' })).toBeTruthy();
    expect(savings()).toBe(fmtEurK(h.endYear.savings));
    expect(payback()).toBe(fmtMonths(h.paybackMonth));
    expect(screen.getByText(/^Savings Y/).parentElement!.title).toContain('Wave 2 (1 produit planifié)');
    // wave 2 is product C alone, starting at month 6: its savings are C's own, later
    const own = computeCase(resolveProduct(pf(), ids[2]));
    expect(h.paybackMonth).toBe(own.payback === null ? null : own.payback + 6);
    choose(`wave:${waves[0]}`);
    expect(savings()).toBe(fmtEurK(waveHeadline(c, waves[0])!.endYear.savings));
  });

  it('choosing a Produit makes it the active product and shows its own figures; the scope is not an undo step and is never saved', () => {
    mountApp();
    const undoDepth = appStore().getState().history.undo.length;
    choose('portfolio');
    choose(`product:${ids[1]}`);
    expect(pf().activeProductId).toBe(ids[1]);
    expect(select().value).toBe(`product:${ids[1]}`);
    expect(savings()).toBe(fmtEurK(computeCase(resolveProduct(pf(), ids[1])).endYear.savings));
    expect(appStore().getState().history.undo.length).toBe(undoDepth);
    choose(`wave:${waves[0]}`);
    expect(JSON.parse(exportSnapshotJson().json).displayScope).toBeUndefined();
    expect(pf().displayScope).toEqual({ kind: 'wave', id: waves[0] });
  });

  it('a deleted wave drops the scope back to the active product', () => {
    mountApp();
    choose(`wave:${waves[1]}`);
    act(() => { removeWave(waves[1]); });
    expect(select().value).toBe(`product:${ids[0]}`);
    expect(screen.getByRole('complementary', { name: 'Headline results' })).toBeTruthy();
  });

  it('with the portfolio scope an edit of the active product moves the figures (they follow the store) and Ctrl+Z restores them', () => {
    mountApp();
    choose('portfolio');
    const before = savings();
    act(() => { setTeamTotal(40); });
    expect(savings()).not.toBe(before);
    expect(savings()).toBe(fmtEurK(portfolioHeadline(consolidate(pf())).endYear.savings));
    act(() => { fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true }); });
    expect(savings()).toBe(before);
  });
});
