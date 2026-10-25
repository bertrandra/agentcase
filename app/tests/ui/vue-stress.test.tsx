// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignWave } from '@/controllers/wave';
import { compareByProduct, productCtx, scenarioByProduct, sensitivityByProduct } from '@/domain/portfolio';
import { compareData, fmtK, fmtPayback, fmtSigned, roiText, scenarioSet } from '@/domain/stress';
import { freshStore } from '../store/helpers';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { banner, bodyRows, expectShown, openDrill, planned, rowOf, totalOf, view } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);

const KEYS = ['ai', 'loc', 'ramp', 'ailoc', 'aidst'] as const;
const scen = (id: string) => scenarioSet(productCtx(pf(), id));
const cell = (id: string, k: (typeof KEYS)[number]) => scen(id).find((s) => s.key === k)!.m;

interface Spec { id: string; title: RegExp; product: RegExp; tables: { name: RegExp; shown: (id: string) => string[] }[]; total?: () => string[];
  drill: (id: string) => {
  caption: RegExp;
  shown: string[]
} }
const SPECS: Spec[] = [
  { id: 'scenarios', title: /Scenario comparison — 6 transformation strategies/, product: /Scenario comparison — 6 transformation strategies/,
    tables: [
      { name: /Net by scenario/, shown: (id) => KEYS.map((k) => fmtSigned(cell(id, k).totBen - cell(id, k).setup)) },
      { name: /ROI by scenario/, shown: (id) => KEYS.map((k) => roiText(cell(id, k))) },
      { name: /Payback by scenario/,
        shown: (id) => KEYS.map((k) => fmtPayback(scenarioByProduct(pf(), [id])[0]!.cells.find((c) => c.key === k)!.payback, cell(id, k).horizon * 12)) },
    ],
    drill: (id) => ({ caption: /ROI trajectory by scenario/, shown: [roiText(cell(id, 'aidst')), roiText(cell(id, 'ai'))] }) },
  { id: 'compare', title: /3-way Comparison/, product: /3-way Comparison — AS-IS \/ AS-IS \+ saving \/ Agentic/,
    tables: [{ name: /Final-year key figures by product/, shown: (id) => {
      const r = compareByProduct(pf(), [id]).rows[0]!;
      return [fmtK(r.agenticSave), fmtK(r.classicSave), fmtK(r.asisCost), r.agenticFte.toFixed(1), r.vfte.toFixed(1)];
    } }],
    total: () => {
      const t = compareByProduct(pf(), planned()).totals;
      return [fmtK(t.agenticSave), fmtK(t.classicSave), t.agenticFte.toFixed(1), t.vfte.toFixed(1)];
    },
    drill: (id) => ({ caption: /Key figures — comparison/, shown: [compareData(productCtx(pf(), id)).rows[0]![3]!] }) },
  { id: 'sensitivity', title: /^Sensitivity$/, product: /^Sensitivity$/,
    tables: [
      { name: /Key parameters by product/, shown: (id) => sensitivityByProduct(pf(), [id])[0]!.params.map((p) => p.value) },
      { name: /Most sensitive parameter/, shown: (id) => {
        const r = sensitivityByProduct(pf(), [id])[0]!;
        return [r.most.parameter, r.most.level, `${r.negative} of ${r.cells}`, `${Math.round((r.roiLow as number) * 100)}%`];
      } },
    ],
    drill: (id) => ({ caption: /Automation × Glass ceiling matrix/, shown: [sensitivityByProduct(pf(), [id])[0]!.params[0]!.value] }) },
];

describe.each(SPECS)('stress aggregate: $id', (s) => {
  const name = (id: string) => pf().products.find((p) => p.id === id)!.name;

  it('Portfolio: one line per planned product with the domain figures, no portfolio total unless the domain supplies one', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    expect(banner()).toBe('Calculated on: Portfolio (3 planned products)');
    for (const t of s.tables) {
      expect(bodyRows(t.name)).toBe(3);
      for (const id of ids) expectShown(rowOf(t.name, id), t.shown(id));
    }
    if (s.total) expectShown(totalOf(s.tables[0]!.name), s.total());
    else expect(totalOf(s.tables[0]!.name)).toBeNull();
    expect(document.body.textContent).not.toMatch(/coming/i);
  });

  it('Wave: only the products of the wave, and the roll-up of those', async () => {
    mountApp(s.id); view('wave', waves[0]);
    await sectionReady(s.title);
    expect(banner()).toContain('Wave: Wave 1 (2 planned products)');
    for (const t of s.tables) {
      expect(bodyRows(t.name)).toBe(2);
      expect(rowOf(t.name, ids[2])).toBeNull();
      expectShown(rowOf(t.name, ids[1]), t.shown(ids[1]));
    }
    if (s.id === 'compare') expectShown(totalOf(s.tables[0]!.name),
      (() => { const t = compareByProduct(pf(), [ids[0], ids[1]]).totals; return [fmtK(t.agenticSave), t.agenticFte.toFixed(1)]; })());
    view('wave', waves[1]);
    await screen.findByText(/Wave: Wave 2 \(1 planned product\)/);
    expect(bodyRows(s.tables[0]!.name)).toBe(1);
  });

  it('an unscheduled product is excluded, with the note', async () => {
    mountApp(s.id); view('portfolio'); act(() => { assignWave(ids[2], null); });
    await sectionReady(s.title);
    expect(bodyRows(s.tables[0]!.name)).toBe(2);
    expect(banner()).toContain('1 unscheduled or archived product excluded from the figures');
    expect(screen.getByText(/Excluded from the figures:/).textContent).toContain(name(ids[2]));
    if (s.total) expectShown(totalOf(s.tables[0]!.name), (() => { const t = compareByProduct(pf(), planned()).totals; return [fmtK(t.agenticSave)]; })());
  });

  it('Product: today’s section, no aggregate', async () => {
    mountApp(s.id); view('portfolio'); view('product');
    await sectionReady(s.product);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(banner()).toBe('Calculated on: Product: Product 1');
  });

  it('the drill-down opens one product, read-only, with that product’s own figures', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(0);
    const region = await openDrill(name(ids[1])), d = s.drill(ids[1]);
    expect((await within(region).findAllByText(d.caption, undefined, LAZY)).length).toBeGreaterThan(0);
    expectShown(region, d.shown);
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
  });
});

describe('stress aggregate: single product', () => {
  it('no banner, no aggregate: the section as it is', async () => {
    freshStore(); mountApp('scenarios');
    await sectionReady(/Scenario comparison/);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
  });
});
