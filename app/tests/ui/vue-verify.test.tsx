// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { assignWave } from '@/controllers/wave';
import * as D from '@/domain/portfolio';
import { periodRows } from '@/domain/verifyA';
import { fmtE, fmtEurK } from '@/ui/format';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { independent } from '../helpers/aggVerify';
import { VERIFY_IDS } from '../helpers/verifyIds';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string];
beforeEach(() => { ({ ids } = threeProducts()); });
afterEach(cleanup);
const core = () => D.corePortfolio(pf());
const view = (s: D.VScope | { kind: 'product' }) => act(() => { setDisplayScope(s); });
const N = (x: D.Cell | undefined): number => +(x ?? 0);
const pct = (x: D.Cell | undefined) => `${Math.round(N(x))}%`;
const scopes = (): [string, D.VScope, string][] => [['Portfolio', { kind: 'portfolio' }, 'Portfolio'],
  ['Wave 1', { kind: 'wave', id: pf().waves[0]!.id }, pf().waves[0]!.name]];

/** id → [caption of the by-product table, the strings its selection line must show (formatted like the domain's figures)]. */
const CASES: Record<string, (s: D.VScope) => [string, string[]]> = {
  'fte-vfte': (s) => { const t = D.fteVfteAgg(core(), s)!.table.total; return ['FTE and vFTE by product',
    [N(t.base).toFixed(1), N(t.agent).toFixed(1), N(t.total).toFixed(1)]]; },
  'vfte-ov': (s) => { const t = D.vfteOvTable(core(), s)!.total; return ['vFTE composition by product',
    [N(t.human).toFixed(1), N(t.agent).toFixed(1), String(Math.round(N(t.arts)))]]; },
  'team-out': (s) => { const t = D.targetTeamAgg(core(), s)!.table.total; return ['Target team by product',
    [N(t.recurring).toFixed(1), N(t.dev).toFixed(1), N(t.run).toFixed(1)]]; },
  'tobe-team': (s) => { const t = D.tobeTeamAgg(core(), s, 2)!.total; return ['TO-BE team by product, Year 3',
    [t.asis.toFixed(2), t.human.toFixed(2), t.agent.toFixed(2)]]; },
  'phase-art': (s) => { const t = D.phaseArtTable(core(), s)!.total; return ['Phase and artifact scope by product', [String(N(t.arts)), String(N(t.viol))]]; },
  'agent-dir': (s) => { const t = D.agentDirTable(core(), s)!.total; return ['Agents by authorization level and product',
    [String(N(t.agents)), String(N(t.roles))]]; },
  'agent-detail': (s) => { const t = D.agentDetailTable(core(), s)!.total; return ['Agentic operating team by product',
    [N(t.run).toFixed(1), N(t.sup).toFixed(1)]]; },
  'agent-usage': (s) => { const t = D.usageAgg(core(), s)!.table.total; return ['Agent usage by product',
    [fmtE(N(t.tokenCost)), String(Math.round(N(t.runs)))]]; },
  exec: (s) => ['Milestones and sprint velocity by product', [String(D.execTable(core(), s)!.total.start)]],
  productivity: (s) => { const t = D.productivityTable(core(), s)!.total; return ['Throughput per engineer by product',
    [N(t.asis).toFixed(1), N(t.end).toFixed(1)]]; },
  velocity: (s) => ['Velocity by product', [N(D.velocityTable(core(), s)!.total.uplift).toFixed(1)]],
  quality: (s) => ['Quality metrics by product', [String(N(D.qualityTable(core(), s)!.total.edited))]],
  compliance: (s) => { const t = D.complianceTable(core(), s)!.total; return ['Compliance coverage by product',
    [pct(t.ceiling), pct(t.max), String(N(t.reg))]]; },
  kpi: (s) => { const a = D.kpiAgg(core(), s)!; return ['KPIs by product', [N(a.table.total.after).toFixed(1), pct(a.table.total.eff)]]; },
  'asis-tobe': (s) => { const t = D.asisTobeAgg(core(), s)!.table.total; return ['AS-IS vs TO-BE by product',
    [fmtE(N(t.cost0)), fmtE(N(t.setup)), pct(t.ceiling)]]; },
};
const titleOf = (id: string) => VERIFY_IDS.find(([i]) => i === id)![1];
const byProduct = (cap: string, label: string) => screen.getByRole('table', { name: new RegExp(`${cap} — ${label}`) });

describe.each(Object.keys(CASES))('verify aggregate %s: figures of the domain', (id) => {
  it.each(scopes())('%s view: the selection line shows the domain figures, one row per planned product', async (_n, scope, label) => {
    mountApp(id); view(scope);
    await sectionReady(titleOf(id));
    const [cap, want] = CASES[id]!(scope), t = byProduct(cap, label);
    const foot = t.querySelector('tfoot tr')!.textContent ?? '';
    for (const w of want) expect(foot, `${id} ${label}`).toContain(w);
    expect(t.querySelectorAll('tbody tr')).toHaveLength(D.verifySelection(core(), scope)!.items.length);
  });

  it('an unscheduled product leaves the figures, with the note', async () => {
    act(() => { assignWave(ids[2], null); });
    mountApp(id); view({ kind: 'portfolio' });
    await sectionReady(titleOf(id));
    const [cap, want] = CASES[id]!({ kind: 'portfolio' }), t = byProduct(cap, 'Portfolio');
    expect(t.querySelectorAll('tbody tr')).toHaveLength(2);
    for (const w of want) expect(t.querySelector('tfoot tr')!.textContent).toContain(w);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('1 unscheduled or archived product excluded from the figures');
  });
});

describe('verify aggregates: kpi cards, year picker, gantt', () => {
  it('kpi: the cards are the headline of the Portfolio and of a Wave', async () => {
    mountApp('kpi'); view({ kind: 'wave', id: pf().waves[0]!.id });
    await sectionReady(/KPI Scorecard/);
    const h = D.kpiAgg(core(), { kind: 'wave', id: pf().waves[0]!.id })!.headline;
    expect(screen.getAllByText('Net').find((e) => e.classList.contains('ac-stat-l'))!.parentElement!.textContent).toContain(fmtEurK(h.net));
  });

  it('tobe-team: the year buttons re-read the domain (Wave view)', async () => {
    const scope: D.VScope = { kind: 'wave', id: pf().waves[0]!.id };
    mountApp('tobe-team'); view(scope);
    await sectionReady(/TO-BE team composition/);
    fireEvent.click(screen.getByRole('button', { name: 'Year 1' }));
    const t = screen.getByRole('table', { name: /TO-BE team by skill, Year 1/ });
    expect(t.querySelector('tfoot tr')!.textContent).toContain(D.tobeTeamAgg(core(), scope, 0)!.total.human.toFixed(2));
  });

  it('gantt (already native): the wave Gantt under the Portfolio and under a Wave, the Product view unchanged', async () => {
    mountApp('gantt'); view({ kind: 'portfolio' });
    await sectionReady(/Gantt/);
    expect(await screen.findByRole('region', { name: 'Wave Gantt' })).toBeTruthy();
    view({ kind: 'wave', id: pf().waves[1]!.id });
    expect(within(screen.getByRole('region', { name: 'Wave Gantt' })).getByText(/— Wave 2/)).toBeTruthy();
    view({ kind: 'product' });
    expect(screen.queryByRole('region', { name: 'Wave Gantt' })).toBeNull();
  });
});

describe('verify roll-ups: the read-only drill-down and "Edit this product"', () => {
  it('vfte-ov: opening B shows B\'s own figures, read-only, without changing the active product', async () => {
    mountApp('vfte-ov'); view({ kind: 'portfolio' });
    await sectionReady(/vFTE Overview/);
    fireEvent.click(screen.getByRole('button', { name: /B$/, expanded: false }));
    const region = await screen.findByRole('region', { name: 'Detail: B' }), b = independent(core(), { kind: 'portfolio' })[1]!;
    expect(await within(region).findByRole('heading', { level: 4 }, LAZY)).toBeTruthy();
    expect(region.textContent).toContain(periodRows(b.live).at(-1)!.human.toFixed(1));
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(pf().activeProductId).toBe(ids[0]);
  });

  it('quality: the product\'s anchors are not editable in the drill-down; "Edit this product" makes B the View', async () => {
    mountApp('quality'); view({ kind: 'portfolio' });
    await sectionReady(/^Quality$/);
    fireEvent.click(screen.getByRole('button', { name: /B$/, expanded: false }));
    const region = await screen.findByRole('region', { name: 'Detail: B' });
    const inputs = await within(region).findAllByRole('spinbutton', undefined, LAZY);
    for (const i of inputs) expect(i.matches(':disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Edit this product: B' }));
    expect(pf().activeProductId).toBe(ids[1]);
    expect(pf().displayScope).toEqual({ kind: 'product' });
    expect((await screen.findAllByRole('spinbutton', { name: /AS-IS/ })).length).toBeGreaterThan(0);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });
});
