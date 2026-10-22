// @vitest-environment jsdom
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableSup } from '@/controllers/modelSupervision';
import { assignWave } from '@/controllers/wave';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { evlModel } from '@/domain/model/evidence';
import { flowModel } from '@/domain/model/flow';
import { model } from '@/domain/model/overlay';
import {
  convergenceByProduct, evidenceByProduct, flowByProduct, productCtx, stochasticByProduct, supervisionByProduct, verificationByProduct,
} from '@/domain/portfolio';
import { fmtEurOrNA as fmtEur, fmtEurK } from '@/ui/format';
import { pfSimStore } from '@/store/portfolioSimulation';
import { freshStore } from '../store/helpers';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { banner, bodyRows, expectShown, openDrill, planned, rowOf, text, totalOf, view } from '../helpers/vueAgg';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { pfSimStore.setState({ run: null, progress: null, params: null }); ({ ids, waves } = threeProducts()); });
afterEach(cleanup);

const pct1 = (v: number): string => `${(v * 100).toFixed(1)}%`;
const onOff = (b: boolean): string => (b ? 'ON' : 'OFF');
const run = () => pfSimStore.getState().run;

interface Spec {
  id: string; title: RegExp; caption: RegExp;
  shown: (id: string) => string[];
  total: (ids: string[]) => string[];
  drill: { caption: RegExp; shown: (id: string) => string[] };
}
const SPECS: Spec[] = [
  { id: 'model-stochastic', title: /Stochastic layer & baseline drift/, caption: /Stochastic layer by product/,
    shown: (id) => { const r = stochasticByProduct(pf(), [id], run()).rows[0]!; return [onOff(r.on), String(r.seed), r.draws.toLocaleString('en-US'), r.p50 === null ? '—' : fmtEur(r.p50)]; },
    total: (s) => { const a = stochasticByProduct(pf(), s, run()); return [`${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Stochastic layer of the product/, shown: (id) => { const r = stochasticByProduct(pf(), [id], run()).rows[0]!; return [String(r.seed), r.p50 === null ? 'Not in the last portfolio simulation' : fmtEur(r.p50)]; } } },
  { id: 'model-convergence', title: /Loop convergence economics/, caption: /Loop convergence by product/,
    shown: (id) => { const r = convergenceByProduct(pf(), [id]).rows[0]!; return [r.weightedEN.toFixed(2), `${r.escapePct.toFixed(1)}%`, onOff(r.on), String(r.loops)]; },
    total: (s) => { const a = convergenceByProduct(pf(), s); return [`${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Loop convergence economics/, shown: () => [] } },
  { id: 'model-supervision', title: /Supervision — provisioned or constrained/, caption: /Supervision by product/,
    shown: (id) => { const r = supervisionByProduct(pf(), [id]).rows[0]!; return [r.supervisors.toFixed(1), r.needed.toFixed(1), fmtEurK(r.runCost), r.vfte.toFixed(1), r.constrained ? 'Constrained' : 'Provisioned']; },
    total: (s) => { const t = supervisionByProduct(pf(), s).totals; return [t.needed.toFixed(1), fmtEurK(t.runCost), t.vfte.toFixed(1)]; },
    drill: { caption: /Agent capacity vs supervision/, shown: (id) => [(model(productCtx(pf(), id)).yearAgentVfte[2] as number).toFixed(2)] } },
  { id: 'model-flow', title: /Flow & value/, caption: /Flow and value by product/,
    shown: (id) => { const r = flowByProduct(pf(), [id]).rows[0]!; return [`${r.ctNew.toFixed(1)} d`, r.wip.toFixed(1), `${(r.theta * 100).toFixed(0)}%`, r.flowNpv === null ? 'no margin given' : fmtEurK(r.flowNpv)]; },
    total: (s) => { const a = flowByProduct(pf(), s); return [a.wip.toFixed(1), `${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Cycle time & WIP/, shown: (id) => [`${flowModel(productCtx(pf(), id)).ctNew.toFixed(1)}d`] } },
  { id: 'model-evidence', title: /Evidence ledger/, caption: /Evidence by product/,
    shown: (id) => { const r = evidenceByProduct(pf(), [id]).rows[0]!; return [r.grade ?? 'n/a', r.score === null ? 'n/a' : `${(r.score * 100).toFixed(0)}%`, onOff(r.on)]; },
    total: (s) => { const a = evidenceByProduct(pf(), s); return [a.worst ? `worst: ${a.worst}` : 'n/a']; },
    drill: { caption: /Evidence ledger of the product/, shown: (id) => [evlModel(productCtx(pf(), id), null).grade ?? 'n/a'] } },
  { id: 'model-verification', title: /Verification tax/, caption: /Verification tax by product/,
    shown: (id) => { const r = verificationByProduct(pf(), [id]).rows[0]!; return [pct1(r.rate), pct1(r.rhoMax), pct1(r.phi), r.net ? 'Net' : 'Overlay']; },
    total: (s) => { const a = verificationByProduct(pf(), s); return [`lowest ${pct1(a.lowestRhoMax as number)}`, `${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Criticality class/, shown: () => [] } },
];

describe.each(SPECS)('model-engine aggregate: $id', (s) => {
  const name = (id: string) => pf().products.find((p) => p.id === id)!.name;

  it('Portfolio: a line per planned product with the phase figures, the roll-up from the domain', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    expect(banner()).toBe('Calculated on: Portfolio (3 planned products)');
    expect(bodyRows(s.caption)).toBe(3);
    for (const id of ids) expectShown(rowOf(s.caption, id), s.shown(id));
    expectShown(totalOf(s.caption), ['Total — Portfolio', ...s.total(planned())]);
    expect(document.body.textContent).not.toMatch(/coming/i);
  });

  it('Wave: only its products, and the roll-up of those', async () => {
    mountApp(s.id); view('wave', waves[0]);
    await sectionReady(s.title);
    expect(banner()).toContain('Wave: Wave 1 (2 planned products)');
    expect(bodyRows(s.caption)).toBe(2); expect(rowOf(s.caption, ids[2])).toBeNull();
    expectShown(rowOf(s.caption, ids[1]), s.shown(ids[1]));
    expectShown(totalOf(s.caption), ['Total — Wave 1', ...s.total([ids[0], ids[1]])]);
    view('wave', waves[1]);
    await screen.findByText(/Wave: Wave 2 \(1 planned product\)/);
    expect(bodyRows(s.caption)).toBe(1); expectShown(rowOf(s.caption, ids[2]), s.shown(ids[2]));
  });

  it('an unscheduled product is excluded, with the note', async () => {
    mountApp(s.id); view('portfolio'); act(() => { assignWave(ids[2], null); });
    await sectionReady(s.title);
    expect(bodyRows(s.caption)).toBe(2);
    expect(banner()).toContain('1 unscheduled or archived product excluded from the figures');
    expect(screen.getByText(/Excluded from the figures:/).textContent).toContain(name(ids[2]));
    expectShown(totalOf(s.caption), s.total(planned()));
  });

  it('Product: today’s section, no aggregate', async () => {
    mountApp(s.id); view('portfolio'); view('product');
    await sectionReady(s.title);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(banner()).toBe('Calculated on: Product: Product 1');
  });

  it('the drill-down opens one product, read-only, with that product’s own figures', async () => {
    mountApp(s.id); view('portfolio');
    await sectionReady(s.title);
    const region = await openDrill(name(ids[1]));
    expect((await within(region).findAllByText(s.drill.caption)).length).toBeGreaterThan(0);
    expectShown(region, s.drill.shown(ids[1]));
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
    expect(region.querySelectorAll('fieldset[disabled]').length).toBeGreaterThan(0);
  });

  it('one product: the section as it is', async () => {
    freshStore(); mountApp(s.id);
    await sectionReady(s.title);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
  });
});

describe('model-engine aggregate: what the phases show', () => {
  it('Supervision: a phase switched on is counted ON in every product', async () => {
    mountApp('model-supervision'); view('portfolio'); act(() => { enableSup(true); });
    await sectionReady(/Supervision — provisioned or constrained/);
    expect(supervisionByProduct(pf(), planned()).totals.on).toBe(3);
    expectShown(totalOf(/Supervision by product/), ['3 of 3 on']);
    for (const id of ids) expectShown(rowOf(/Supervision by product/, id), ['ON']);
  });

  it('Stochastic: after the portfolio run each product shows its P50 and the roll-up is the selection’s P50', async () => {
    await runPortfolioSimulation({ draws: 200, seed: 4 });
    mountApp('model-stochastic'); view('portfolio');
    await sectionReady(/Stochastic layer & baseline drift/);
    const r = run()!;
    for (const p of r.products) expectShown(rowOf(/Stochastic layer by product/, p.id), [fmtEur(p.stats.p50)]);
    expectShown(totalOf(/Stochastic layer by product/), [fmtEur(r.stats.p50)]);
    view('wave', waves[1]);
    await screen.findByText(/Calculated on: Wave: Wave 2/);
    expectShown(totalOf(/Stochastic layer by product/), [fmtEur(r.waves.find((w) => w.id === waves[1])!.stats.p50)]);
    expect(text(screen.getByRole('button', { name: /Portfolio stress/ }))).toContain('Portfolio stress');
  });
});
