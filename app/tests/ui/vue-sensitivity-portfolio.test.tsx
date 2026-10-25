// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { portfolioSensitivity } from '@/domain/portfolio';
import { fmtSigned } from '@/domain/stress';
import { axeViolations } from '../helpers/axe';
import { eachThree } from '../helpers/threeEach';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { bodyRows, expectShown, planned, rowOf, table, totalOf, view } from '../helpers/vueAgg';

const TITLE = /Sensitivity/;
vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

const three = eachThree();
const MAIN = /Portfolio sensitivity — Portfolio \(±10%/;
const SHOW = 'Show the breakdown by product (three largest swings)';

describe('Sensitivity, Portfolio / Wave: the tornado summed on the portfolio calendar', () => {
  it('Portfolio: one row per driver, ranked, with the domain’s net and NPV at −step / +step', async () => {
    mountApp('sensitivity'); view('portfolio');
    await sectionReady(TITLE);
    const d = portfolioSensitivity(pf(), planned(), 10), rows = within(table(MAIN)).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(d.rows.length);
    d.rows.forEach((r, i) => expectShown(rows[i]!, [r.label, fmtSigned(r.down.net), fmtSigned(r.up.net), fmtSigned(r.down.npv), fmtSigned(r.swing)]));
    expect(document.querySelector('[data-pf-tornado-top]')!.textContent).toContain(d.rows[0]!.label);
  });

  it('the step is view state: ±20% reruns the tornado', async () => {
    mountApp('sensitivity'); view('portfolio');
    await sectionReady(TITLE);
    fireEvent.change(screen.getByLabelText('Relative step'), { target: { value: '20' } });
    const d = portfolioSensitivity(pf(), planned(), 20);
    expectShown(table(/Portfolio sensitivity — Portfolio \(±20%/), [fmtSigned(d.rows[0]!.up.net), 'Net at +20% (€)']);
  });

  it('the breakdown by product opens; its total line is the driver row', async () => {
    mountApp('sensitivity'); view('portfolio');
    await sectionReady(TITLE);
    const d = portfolioSensitivity(pf(), planned(), 10), top = d.rows[0]!, NET = new RegExp(`${top.label}: net by product — Portfolio`);
    const toggle = screen.getByRole('button', { name: SHOW });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(bodyRows(NET)).toBe(3);
    for (const p of top.products) expectShown(rowOf(NET, p.id), [String(p.month0 + 1), fmtSigned(p.down.net), fmtSigned(p.up.net)]);
    expectShown(totalOf(NET), [fmtSigned(top.down.net), fmtSigned(top.up.net)]);
  });

  it('Wave: the products of that wave only', async () => {
    mountApp('sensitivity'); view('wave', three().waves[0]);
    await sectionReady(TITLE);
    const [a, b, c] = three().ids, d = portfolioSensitivity(pf(), [a, b], 10), top = d.rows[0]!;
    expectShown(table(/Portfolio sensitivity — Wave 1/), [fmtSigned(top.down.net), fmtSigned(top.up.net)]);
    fireEvent.click(screen.getByRole('button', { name: SHOW }));
    const NET = new RegExp(`${top.label}: net by product — Wave 1`);
    expect(bodyRows(NET)).toBe(2);
    expect(rowOf(NET, c)).toBeNull();
  });

  it('axe finds no violation', async () => {
    mountApp('sensitivity'); view('portfolio');
    await sectionReady(TITLE);
    fireEvent.click(screen.getByRole('button', { name: SHOW }));
    expect(await axeViolations(document.querySelector('main'))).toEqual([]);
  });
});
