// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { portfolioScenarios } from '@/domain/portfolio';
import { fmtPayback, fmtSigned, roiText } from '@/domain/stress';
import { axeViolations } from '../helpers/axe';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { bodyRows, expectShown, planned, rowOf, table, totalOf, view } from '../helpers/vueAgg';

const TITLE = /Scenario comparison — 6 transformation strategies/;
vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** The 3-product store of `threeProducts` (A, B in wave 1; C in wave 2). */
let three: ReturnType<typeof threeProducts>;
beforeEach(() => { three = threeProducts(); });
afterEach(cleanup);
const MAIN = /Portfolio scenarios — Portfolio/, NET = /Net by product on the portfolio calendar/, NPV = /NPV by product/;

describe('Scenarios, Portfolio / Wave: the six scenarios summed on the portfolio calendar', () => {
  it('Portfolio: one row per scenario with the domain’s net, NPV, ROI and payback', async () => {
    mountApp('scenarios'); view('portfolio');
    await sectionReady(TITLE);
    const d = portfolioScenarios(pf(), planned()), rows = within(table(MAIN)).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    d.rows.forEach((r, i) => expectShown(rows[i]!, [r.label, fmtSigned(r.figures.net), fmtSigned(r.figures.npv), roiText(r.figures),
      fmtPayback(r.figures.payback, d.horizon)]));
  });

  it('the breakdown by product opens, and its total line is the portfolio row', async () => {
    mountApp('scenarios'); view('portfolio');
    await sectionReady(TITLE);
    const d = portfolioScenarios(pf(), planned()), toggle = screen.getByRole('button', { name: 'Show the breakdown by product' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('table', { name: NET })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Hide the breakdown by product');
    expect(bodyRows(NET)).toBe(3);
    for (const p of d.byProduct) expectShown(rowOf(NET, p.id), [String(p.month0 + 1), ...p.cells.map((c) => fmtSigned(c.net))]);
    expectShown(totalOf(NET), d.rows.map((r) => fmtSigned(r.figures.net)));
    expectShown(totalOf(NPV), d.rows.map((r) => fmtSigned(r.figures.npv)));
  });

  it('Wave: the products of that wave only', async () => {
    mountApp('scenarios'); view('wave', three.waves[0]);
    await sectionReady(TITLE);
    const [a, b, c] = three.ids, d = portfolioScenarios(pf(), [a, b]);
    fireEvent.click(screen.getByRole('button', { name: 'Show the breakdown by product' }));
    expect(bodyRows(NET)).toBe(2);
    expect(rowOf(NET, c)).toBeNull();
    expectShown(totalOf(NET), d.rows.map((r) => fmtSigned(r.figures.net)));
    expectShown(table(/Portfolio scenarios — Wave 1/), [fmtSigned(d.rows[0]!.figures.net)]);
  });

  it('axe finds no violation', async () => {
    mountApp('scenarios'); view('portfolio');
    await sectionReady(TITLE);
    fireEvent.click(screen.getByRole('button', { name: 'Show the breakdown by product' }));
    expect(await axeViolations(document.querySelector('main'))).toEqual([]);
  });
});
