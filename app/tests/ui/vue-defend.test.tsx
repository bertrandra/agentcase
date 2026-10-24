// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignWave } from '@/controllers/wave';
import { benchmarkBase } from '@/domain/pdc/assumptions';
import { ddBase } from '@/domain/pdc/dd';
import { assumptionsByProduct, dueDiligenceByProduct, verifByProduct } from '@/domain/portfolio';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { SECTIONS } from '@/ui/zones/registry';
import { freshStore } from '../store/helpers';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { banner, bodyRows, expectShown, openDrill, planned, rowOf, table, text, totalOf, view } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);

const base = benchmarkBase(defaultDoc), dd = ddBase(defaultDoc), rt = { sections: SECTIONS };
const cells = (row: Element | null): string[] => Array.from(row?.querySelectorAll('td') ?? []).map((td) => text(td));
const s = (...v: (string | number)[]): string[] => v.map(String);

interface Spec {
  id: string; title: RegExp; caption: RegExp;
  row: (id: string) => string[];
  total: (ids: string[]) => string[];
  drill: { caption: RegExp; shown: (id: string) => string[] };
}
const SPECS: Spec[] = [
  { id: 'assumptions', title: /Assumptions register/, caption: /Assumptions by product/,
    row: (id) => { const r = assumptionsByProduct(pf(), [id], base).rows[0]!; return s(r.inputs, r.atDefault, r.adjusted, r.validated, r.state, r.overrides); },
    total: (l) => { const t = assumptionsByProduct(pf(), l, base).totals; return s(t.inputs, t.atDefault, t.adjusted, t.validated, t.state, t.overrides); },
    drill: { caption: /Assumptions register/, shown: (id) => { const r = assumptionsByProduct(pf(), [id], base).rows[0]!; return [`${r.atDefault} at default`, `${r.adjusted} adjusted`]; } } },
  { id: 'verif', title: /Detailed logic verification/, caption: /Logic verification by product/,
    row: (id) => { const r = verifByProduct(pf(), [id], rt).rows[0]!; return s(r.status, `${r.checksFail} of ${r.checks}`, `${r.convFail} of ${r.conv}`, r.failing.length ? r.failing.join(', ') : '—', r.sensiAbnormal, r.roi); },
    total: (l) => { const t = verifByProduct(pf(), l, rt).totals; return s(t.status === 'PASS' ? 'PASS' : `FAIL (${t.failingProducts} product${t.failingProducts > 1 ? 's' : ''})`, `${t.checksFail} of ${t.checks}`, `${t.convFail} of ${t.conv}`, '', t.sensiAbnormal, ''); },
    drill: { caption: /Convergence checks/, shown: (id) => { const r = verifByProduct(pf(), [id], rt).rows[0]!; return [`${r.convFail} failing of ${r.conv} invariants`]; } } },
  { id: 'duediligence', title: /Due diligence/, caption: /Due diligence by product/,
    row: (id) => { const r = dueDiligenceByProduct(pf(), [id], dd).rows[0]!; return s(r.items, r.confirmed, r.open, `${r.pct}%`, r.invisible, r.ceilCover === null ? 'n/a' : `${Math.round(r.ceilCover * 100)}%`); },
    total: (l) => { const t = dueDiligenceByProduct(pf(), l, dd).totals; return s(t.items, t.confirmed, t.open, `${t.pct}%`, t.invisible, ''); },
    drill: { caption: /Due diligence register of the product/, shown: (id) => { const r = dueDiligenceByProduct(pf(), [id], dd).rows[0]!; return [`${r.items}Items to confirm`, `${r.confirmed} (${r.pct}%)`, r.groups[0]!.group]; } } },
];

describe.each(SPECS)('defend aggregate: $id', (sp) => {
  const name = (id: string) => pf().products.find((p) => p.id === id)!.name;

  it('Portfolio: a line per planned product with the domain counts, the roll-up from the domain', async () => {
    mountApp(sp.id); view('portfolio');
    await sectionReady(sp.title);
    expect(banner()).toBe('Calculated on: Portfolio (3 planned products)');
    expect(bodyRows(sp.caption)).toBe(3);
    for (const id of ids) expect(cells(rowOf(sp.caption, id))).toEqual(sp.row(id));
    expect(cells(totalOf(sp.caption))).toEqual(sp.total(planned()));
    expect(text(totalOf(sp.caption))).toContain('Total — Portfolio');
    expect(document.body.textContent).not.toMatch(/coming/i);
  });

  it('Wave: only its products, and the roll-up of those', async () => {
    mountApp(sp.id); view('wave', waves[0]);
    await sectionReady(sp.title);
    expect(banner()).toContain('Wave: Wave 1 (2 planned products)');
    expect(bodyRows(sp.caption)).toBe(2); expect(rowOf(sp.caption, ids[2])).toBeNull();
    expect(cells(rowOf(sp.caption, ids[1]))).toEqual(sp.row(ids[1]));
    expect(cells(totalOf(sp.caption))).toEqual(sp.total([ids[0], ids[1]]));
    view('wave', waves[1]);
    await screen.findByText(/Calculated on: Wave: Wave 2 \(1 planned product\)/);
    expect(bodyRows(sp.caption)).toBe(1); expect(cells(rowOf(sp.caption, ids[2]))).toEqual(sp.row(ids[2]));
  });

  it('an unscheduled product is excluded, with the note', async () => {
    mountApp(sp.id); view('portfolio'); act(() => { assignWave(ids[2], null); });
    await sectionReady(sp.title);
    expect(bodyRows(sp.caption)).toBe(2);
    expect(banner()).toContain('1 unscheduled or archived product excluded from the figures');
    expect(screen.getByText(/Excluded from the figures:/).textContent).toContain(name(ids[2]));
    expect(cells(totalOf(sp.caption))).toEqual(sp.total(planned()));
  });

  it('Product: today’s section, no aggregate', async () => {
    mountApp(sp.id); view('portfolio'); view('product');
    await sectionReady(sp.title);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(banner()).toBe('Calculated on: Product: Product 1');
  });

  it('the drill-down opens one product, read-only, with that product’s own figures', async () => {
    mountApp(sp.id); view('portfolio');
    await sectionReady(sp.title);
    const region = await openDrill(name(ids[1]));
    expect((await within(region).findAllByText(sp.drill.caption, undefined, LAZY)).length).toBeGreaterThan(0);
    expectShown(region, sp.drill.shown(ids[1]));
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
    expect(region.querySelectorAll('fieldset[disabled]').length).toBeGreaterThan(0);
  });

  it('one product: the section as it is', async () => {
    freshStore(); mountApp(sp.id);
    await sectionReady(sp.title);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
  });
});

describe('defend aggregate: what each section says', () => {
  it('Due diligence: the pack is the edited product’s only, and the table is read-only', async () => {
    mountApp('duediligence'); view('portfolio');
    await sectionReady(/Due diligence/);
    expect(screen.getByText(/edited product only/)).toBeTruthy();
    expect(table(/Due diligence by product/).querySelectorAll('button')).toHaveLength(0);
  });

  it('Logic verification: 67 convergence rows per product', async () => {
    mountApp('verif'); view('portfolio');
    await sectionReady(/Detailed logic verification/);
    for (const id of ids) expect(text(rowOf(/Logic verification by product/, id))).toMatch(/of 67/);
  });

  it('Assumptions: nothing is validated with the client by default', async () => {
    mountApp('assumptions'); view('portfolio');
    await sectionReady(/Assumptions register/);
    expect(cells(totalOf(/Assumptions by product/))[3]).toBe('0');
  });
});
