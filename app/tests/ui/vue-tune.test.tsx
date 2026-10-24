// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setProductOverride } from '@/controllers/productOverrides';
import { setAllReadiness } from '@/controllers/tuneA';
import * as D from '@/domain/portfolio';
import { corePortfolio, scheduledProducts, type Portfolio } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { fmtEurK } from '@/ui/format';
import { eur, eurK, fix } from '@/ui/sections/tuneB/fmt';
import { freshStore } from '../store/helpers';
import { openPortfolioFixture } from '../helpers/portfolioFixtures';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

type View = { kind: 'portfolio' } | { kind: 'wave'; i: 0 | 1 };
interface Case {
  id: string; title: RegExp; caption: string; input: boolean; drill?: (id: string, p: Portfolio) => string; spread?: string;
  rows: (p: Portfolio, ids: string[]) => { id: string; texts: string[] }[]; total?: (p: Portfolio, ids: string[]) => string[];
}
const U = (k: string) => k.toUpperCase();
const CASES: Case[] = [
  { id: 'maturity-map', title: /Maturity levels/, caption: 'Maturity thresholds by product', input: true, spread: 'Spread of the thresholds',
    rows: (p, ids) => D.aggMaturityMap(p, ids).rows.map((r) => ({ id: r.id, texts: [r.ramp.map((x) => Math.round(x)).join(' / '), `L${r.reached} (adoption L${r.adoptionLevel}, share L${r.shareLevel}`] })) },
  { id: 'readiness', title: /AI Readiness Index/, caption: 'AI readiness by product', input: false, drill: (id, p) => { const r = D.aggReadiness(p, [id]).rows[0]!; return `${r.hri}/100 · ${r.hriLabel}`; },
    spread: 'Spread of the readiness', rows: (p, ids) => D.aggReadiness(p, ids).rows.map((r) => ({ id: r.id, texts: [String(Math.round(r.index ?? 0)), r.band, String(r.answered)] })),
    total: (p, ids) => { const a = D.aggReadiness(p, ids); return [`${a.assessed} of ${a.rows.length} assessed`, String(Math.round(a.index.avg))]; } },
  { id: 'lifecycle-edit', title: /Product profile & phase coefficients/, caption: 'Profile and postures by product', input: true, spread: 'Spread of the lifecycle inputs',
    rows: (p, ids) => D.aggLifecycle(p, ids).rows.map((r) => ({ id: r.id, texts: [r.profile, r.pos.toFixed(0), ...r.postures.map((x) => x.toFixed(2))] })) },
  { id: 'token-econ', title: /Token economics/, caption: 'Token usage and cost by product', input: false, drill: (id, p) => eur(D.aggTokens(p, [id]).rows[0]!.costEnd),
    spread: 'Spread of the token cost', rows: (p, ids) => D.aggTokens(p, ids).rows.map((r) => ({ id: r.id, texts: [eur(r.costEnd), eur(r.horizonCost), eur(r.blended)] })),
    total: (p, ids) => [eur(D.aggTokens(p, ids).totals.horizonCost)] },
  { id: 'knowledge', title: /Knowledge hub/, caption: 'Knowledge hub subset by product', input: true, spread: 'Spread of the hub levels',
    rows: (p, ids) => D.aggKnowledge(p, ids).rows.map((r) => ({ id: r.id, texts: [`CC${r.asisCC} → CC${r.targetCC}`, fmtEurK(r.setup), r.asisScore.toFixed(0), r.curationFTE.toFixed(2)] })),
    total: (p, ids) => { const t = D.aggKnowledge(p, ids).totals; return [fmtEurK(t.setup), fmtEurK(t.annual)]; } },
  { id: 'run-sizing', title: /Agentic run-team sizing/, caption: 'Run-team sizing by product', input: true, spread: 'Spread of the sizing inputs',
    rows: (p, ids) => D.aggRunSizing(p, ids).rows.map((r) => ({ id: r.id, texts: [fix(r.floorMin, 1), fix(r.runFte, 2), eur(r.runCost)] })),
    total: (p, ids) => { const t = D.aggRunSizing(p, ids).totals; return [fix(t.runFte, 2), eur(t.runCost)]; } },
  { id: 'opmodel', title: /Operating model/, caption: 'Team topology by product', input: false,
    drill: (id, p) => { const r = D.aggOpModel(p, [id]).rows[0]!; return `the residual is ${r.yN.residual.toFixed(1)} FTE across ${r.yN.pods} pod`; },
    rows: (p, ids) => D.aggOpModel(p, ids).rows.map((r) => ({ id: r.id, texts: [fix(r.y1.residual, 1), fix(r.yN.total, 1), r.ok ? '✓ holds' : '✗ fails'] })),
    total: (p, ids) => { const t = D.aggOpModel(p, ids).totals; return [fix(t.y1.total, 1), `${t.ok} of ${ids.length} hold`]; } },
  { id: 'setup', title: /Agentic Setup/, caption: 'Setup lines by product', input: true, spread: 'Spread of the setup inputs',
    rows: (p, ids) => D.aggSetup(p, ids).rows.map((r) => ({ id: r.id, texts: [eurK(r.tooling), eurK(r.total)] })),
    total: (p, ids) => { const t = D.aggSetup(p, ids).totals; return [eurK(t.tooling), eurK(t.total)]; } },
  { id: 'eligibility', title: /Eligibility & Abaques/, caption: 'Eligibility gate by product', input: false, drill: (id, p) => (D.aggEligibility(p, [id]).rows[0]!.verdict === 'no-go' ? 'NO-GO' : 'GO'),
    rows: (p, ids) => D.aggEligibility(p, ids).rows.map((r) => ({ id: r.id, texts: [U(r.verdict), `${(r.vTaxRate * 100).toFixed(1)}%`, `L${r.level}`] })),
    total: (p, ids) => { const t = D.aggEligibility(p, ids).totals; return [`${t.go} go · ${t.conditional} conditional · ${t.noGo} blocked`]; } },
  { id: 'maturity', title: /Maturity & Measurement/, caption: 'Maturity and coaching by product', input: true, spread: 'Spread of the maturity inputs',
    rows: (p, ids) => D.aggMaturity(p, ids).rows.map((r) => ({ id: r.id, texts: [r.sddName, r.sdd.toFixed(0), eurK(r.coachCostY1)] })), total: (p, ids) => [eurK(D.aggMaturity(p, ids).totals.coachCostY1)] },
  { id: 'program', title: /Program & Completeness/, caption: 'Programme inputs by product', input: true, spread: 'Spread of the programme inputs',
    rows: (p, ids) => D.aggProgram(p, ids).rows.map((r) => ({ id: r.id, texts: [r.pilotFte.toFixed(1), eurK(r.pilotCost), `${r.capPct}%`] })),
    total: (p, ids) => { const t = D.aggProgram(p, ids).totals; return [t.pilotFte.toFixed(1), eurK(t.pilotCost)]; } },
  { id: 'risk', title: /Risk & Compliance/, caption: 'Risk inputs by product', input: true, spread: 'Spread of the risk inputs',
    rows: (p, ids) => D.aggRisk(p, ids).rows.map((r) => ({ id: r.id, texts: [r.tierLabel, r.score.toFixed(2), r.band, (r.diBar * 100).toFixed(1)] })) },
];

const idsOf = (v: View): string[] => scheduledProducts(corePortfolio(pf())).filter((s) => v.kind === 'portfolio' || s.wave.id === pf().waves[v.i]!.id).map((s) => s.product.id);
const label = (v: View): string => (v.kind === 'portfolio' ? 'Portfolio' : pf().waves[v.i]!.name);
const show = (v: View) => act(() => { setDisplayScope(v.kind === 'portfolio' ? { kind: 'portfolio' } : { kind: 'wave', id: pf().waves[v.i]!.id }); });
const VIEWS: View[] = [{ kind: 'portfolio' }, { kind: 'wave', i: 0 }, { kind: 'wave', i: 1 }];
const banner = () => document.querySelector('.ac-scope-banner')?.textContent ?? '';

let ids: string[], active: { id: string; name: string };
beforeEach(() => {
  openPortfolioFixture('pf-three-products');
  ids = idsOf({ kind: 'portfolio' });
  active = { id: pf().activeProductId, name: pf().products.find((x) => x.id === pf().activeProductId)!.name };
  const [, b, c] = ids as [string, string, string];
  setProductOverride(b, 'values.setupTooling', '50000'); setProductOverride(c, 'values.setupTooling', '5000'); setProductOverride(b, 'values.runFloorMin', '2');
  setProductOverride(b, 'values.sddMat', '60'); setProductOverride(b, 'values.pilotFte', '5'); setProductOverride(c, 'values.aiActTier', 'high');
  setProductOverride(c, 'values.elPre_plat', 'unmet'); setProductOverride(b, 'lifecyclePos', 80); setProductOverride(c, 'MATURITY_MAP', { rampBounds: [0, 30, 60, 85] });
  setAllReadiness(50);
});
afterEach(cleanup);

const table = (caption: string, v: View) => screen.getByRole('table', { name: new RegExp(`${caption} — ${label(v)}`) });

describe.each(CASES)('$id: Portfolio and each Wave show the domain figures', (k) => {
  it.each(VIEWS.map((v) => [v.kind === 'portfolio' ? 'Portfolio' : `Wave ${v.i + 1}`, v] as const))('%s', async (_n, v) => {
    mountApp(k.id); show(v);
    await sectionReady(k.title);
    const p = corePortfolio(pf()), sel = idsOf(v), t = table(k.caption, v);
    expect(banner()).toContain(k.input ? 'Changing: all products (shared values) — aggregate view' : 'Calculated on:');   // "Change: All products" (default)
    expect(t.querySelectorAll('tbody tr')).toHaveLength(sel.length);
    for (const r of k.rows(p, sel)) for (const x of r.texts) expect(t.querySelector(`tbody tr[data-row="${r.id}"]`)!.textContent, `${k.id} ${r.id}`).toContain(x);
    for (const x of k.total?.(p, sel) ?? []) expect(t.querySelector('tfoot tr')!.textContent, `${k.id} total`).toContain(x);
    if (k.spread) expect(screen.getByRole('table', { name: new RegExp(`${k.spread} — ${label(v)}`) }).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    if (v.kind === 'portfolio') expect(screen.getByText(/Excluded from the figures/).textContent).toContain('Archive (no wave)');
    expect(screen.getAllByRole('button', { name: /^Edit this product/ })).toHaveLength(sel.length);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('Product view: the section as before (no aggregate, no banner of a view)', async () => {
    mountApp(k.id); show({ kind: 'portfolio' }); act(() => { setDisplayScope({ kind: 'product' }); });
    await sectionReady(k.title);
    expect(document.querySelector('.ac-agg-table, .ac-drill, [data-readonly]')).toBeNull();
    expect(banner()).toBe(k.input ? `Changing: product ${active.name}` : `Calculated on: Product: ${active.name}`);
  });

  if (k.input) {
    it('"Edit this product" makes the View that product and the section editable again', async () => {
      mountApp(k.id); show({ kind: 'portfolio' });
      await sectionReady(k.title);
      const undo = appStore().getState().history.undo.length;
      fireEvent.click(screen.getByRole('button', { name: 'Edit this product: Billing' }));
      expect(pf().activeProductId).toBe(ids[2]);
      expect(pf().displayScope).toEqual({ kind: 'product' });
      expect(appStore().getState().history.undo).toHaveLength(undo);
      await waitFor(() => expect(document.querySelector('.ac-agg-table')).toBeNull());
      expect(banner()).toBe('Changing: product Billing');
    });
  } else {
    it.each(VIEWS.slice(0, 2).map((v) => [v.kind === 'portfolio' ? 'Portfolio' : 'Wave 1', v] as const))('%s: the product detail opens read-only and shows that product’s figures', async (_n, v) => {
      mountApp(k.id); show(v);
      await sectionReady(k.title);
      expect(document.querySelectorAll('[data-readonly]')).toHaveLength(0);
      fireEvent.click(screen.getByRole('button', { name: /Product 1$/, expanded: false }));
      const region = await screen.findByRole('region', { name: 'Detail: Product 1' });
      expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
      await waitFor(() => expect(region.textContent).toContain(k.drill!(ids[0]!, corePortfolio(pf()))), LAZY);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
      expect(pf().activeProductId).toBe(active.id);
    });
  }
});

describe('one product: nothing changes', () => {
  it.each(CASES.map((k) => [k.id, k] as const))('%s: no banner, no aggregate', async (_id, k) => {
    freshStore();
    mountApp(k.id);
    await sectionReady(k.title);
    expect(document.querySelector('.ac-scope-banner, .ac-agg-table, .ac-drill')).toBeNull();
    expect(within(document.querySelector('main')!).getAllByRole('article')).toHaveLength(1);
  });
});

describe('smoke: every section of the group renders under the Portfolio and under a Wave', () => {
  it.each(CASES.flatMap((k) => VIEWS.slice(0, 2).map((v) => [k.id, v.kind === 'portfolio' ? 'Portfolio' : 'Wave 1', k, v] as const)))('%s / %s', async (_id, _n, k, v) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mountApp(k.id); show(v);
    await sectionReady(k.title);
    expect(banner()).not.toBe('');
    expect(document.body.textContent).not.toMatch(/coming soon|Consolidated view coming|à venir/i);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
