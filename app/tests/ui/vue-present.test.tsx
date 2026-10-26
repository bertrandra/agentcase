// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignWave } from '@/controllers/wave';
import { aggregateCommercial, aggregatePlayback, aggregateStory, consolidate } from '@/domain/portfolio';
import { CM_DEFS } from '@/domain/pdc/commercial';
import { fmt1, fmtK } from '@/ui/economicsFormat';
import { fmtMonths } from '@/ui/format';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { bodyRows, table, totalRow, view } from '../helpers/vueEPV';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const scopes = () => [{ name: 'Portfolio', scope: { kind: 'portfolio' } as const, n: 3 },
  { name: 'Wave 1', scope: { kind: 'wave', id: waves[0] } as const, n: 2 }, { name: 'Wave 2', scope: { kind: 'wave', id: waves[1] } as const, n: 1 }];
const banner = () => document.querySelector('.ac-scope-banner')!.textContent;

describe('Present > Monthly Playback: aggregate view', () => {
  it.each([0, 1, 2])('scope %i: the consolidated trajectory and the end state by product are the domain figures', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('monthly-playback'); view(scope);
    await sectionReady(new RegExp(`Monthly Playback — ${name}`));
    const a = aggregatePlayback(pf(), consolidate(pf()), scope)!;
    expect(bodyRows(/End state by product/)).toHaveLength(n);
    expect(totalRow(/End state by product/).textContent).toContain(fmtK(a.totals.net));
    expect(totalRow(/End state by product/).textContent).toContain(fmt1(a.totals.etp));
    expect(totalRow(/End state by product/).textContent).toContain(`+${Math.round(a.totals.velocityPct)}%`);
    expect(screen.getByRole('img', { name: new RegExp(`${name}, monthly trajectory, ${a.series.months} months`) })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Transport' })).toBeTruthy();
    expect(banner()).toContain('Calculated on');
  });
  it('the metric selection still drives the chart; an unscheduled product is excluded; Product view is today\'s section', async () => {
    mountApp('monthly-playback'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Monthly Playback — Portfolio/);
    expect(bodyRows(/End state by product/)).toHaveLength(2);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Human FTE / agent vFTE' }));
    expect(screen.getByTestId('mp-title').textContent).toBe('Monthly run cost');
    view({ kind: 'product' });
    await sectionReady(/^Monthly Playback$/);
    expect(document.querySelector('.ac-agg-table')).toBeNull();
  });
});

describe('Present > The story so far: aggregate view', () => {
  it.each([0, 1, 2])('scope %i: the sentence, the AS-IS / TO-BE table and the product stories are the domain figures', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('story-summary'); view(scope);
    await sectionReady(new RegExp(`The story so far — AS-IS → TO-BE — ${name}`));
    const a = aggregateStory(pf(), consolidate(pf()), scope)!, s = a.story;
    expect(table(/AS-IS vs TO-BE/).textContent).toContain(s.baseFte.toFixed(1));
    expect(table(/AS-IS vs TO-BE/).textContent).toContain(fmtK(s.endSavings));
    expect(bodyRows(/Story by product/)).toHaveLength(n);
    expect(totalRow(/Story by product/).textContent).toContain(s.tgtFte.toFixed(1));
    expect(totalRow(/Story by product/).textContent).toContain(fmtMonths(s.paybackMonth));
    expect(banner()).toContain('Calculated on');
  });
  it('an unscheduled product is excluded; Product view is today\'s section', async () => {
    mountApp('story-summary'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/The story so far — AS-IS → TO-BE — Portfolio/);
    expect(bodyRows(/Story by product/)).toHaveLength(2);
    expect(screen.getByText(/Excluded from the figures/)).toBeTruthy();
    view({ kind: 'product' });
    await sectionReady(/^📖 The story so far — AS-IS → TO-BE$/);
    expect(document.querySelector('.ac-agg-table')).toBeNull();
  });
});

describe('Present > Commercial model: roll-up view', () => {
  it.each([0, 1, 2])('scope %i: each product\'s selected model, the roll-up and the drill-down', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('commercial'); view(scope);
    await sectionReady(new RegExp(`Commercial model — ${name}`));
    const a = aggregateCommercial(pf(), consolidate(pf()), scope)!;
    expect(bodyRows(/Commercial model by product/)).toHaveLength(n);
    expect(table(/Commercial model by product/).querySelector('tbody tr')!.textContent).toContain(CM_DEFS[a.rows[0]!.selected].label);
    expect(totalRow(/Commercial model by product/).textContent).toContain(fmtK(a.totals.revenue));
    expect(totalRow(/Commercial model by product/).textContent).toContain(fmtK(a.totals.margin));
    expect(banner()).toContain('Calculated on');
    expect(screen.getAllByRole('button', { name: /^Edit this product/ })).toHaveLength(n);
  });
  it('ProductDrill opens one product read-only and "Edit this product" makes it the View', async () => {
    mountApp('commercial'); view({ kind: 'portfolio' });
    await sectionReady(/Commercial model — Portfolio/);
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /B$/, expanded: false }));
    const region = await screen.findByRole('region', { name: 'Detail: B' });
    const b = aggregateCommercial(pf(), consolidate(pf()), { kind: 'portfolio' })!.rows.find((r) => r.id === ids[1])!;
    expect((await within(region).findByRole('table', undefined, LAZY)).textContent).toContain(fmtK(b.row.revenue));
    expect(document.querySelectorAll('[data-readonly]')).toHaveLength(1);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    fireEvent.click(within(region.closest('li')!).getByRole('button', { name: 'Edit this product: B' }));
    expect(pf().activeProductId).toBe(ids[1]);
    expect(pf().displayScope).toEqual({ kind: 'product' });
    await sectionReady(/^Commercial model$/);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });
  it('an unscheduled product is excluded with the note', async () => {
    mountApp('commercial'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Commercial model — Portfolio/);
    expect(bodyRows(/Commercial model by product/)).toHaveLength(2);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
  });
});
