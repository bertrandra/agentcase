// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignWave } from '@/controllers/wave';
import { aggregateAnnual, aggregateMonthly, aggregateRun, consolidate } from '@/domain/portfolio';
import { fmtRoiPct } from '@/domain/economics/roi';
import { fmt1, fmtE, fmtK } from '@/ui/economicsFormat';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { bodyRows, stat, table, totalRow, view } from '../helpers/vueEPV';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string], waves: [string, string];
beforeEach(() => { ({ ids, waves } = threeProducts()); });
afterEach(cleanup);
const scopes = () => [{ name: 'Portfolio', scope: { kind: 'portfolio' } as const, n: 3 }, { name: 'Wave 1', scope: { kind: 'wave', id: waves[0] } as const, n: 2 }, { name: 'Wave 2', scope: { kind: 'wave', id: waves[1] } as const, n: 1 }];

describe('Economics > Agentic Run: aggregate view', () => {
  it.each([0, 1, 2])('scope %i: totals, product lines and calendar years are the domain figures', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('run'); view(scope);
    await sectionReady(new RegExp(`Agentic Run — Recurring costs — ${name}`));
    const a = aggregateRun(pf(), consolidate(pf()), scope)!;
    expect(stat('Run cost (horizon)')).toBe(fmtK(a.totals.run));
    expect(stat('Tokens')).toBe(fmtK(a.totals.token));
    expect(bodyRows(/Recurring costs by product/)).toHaveLength(n);
    expect(totalRow(/Recurring costs by product/).textContent).toContain(fmtK(a.totals.run));
    expect(totalRow(/Recurring costs by product/).textContent).toContain(fmt1(a.totals.etp));
    expect(bodyRows(/Recurring costs by calendar year/)).toHaveLength(a.years.length);
    expect(table(/by calendar year/).querySelector('tbody tr')!.textContent).toContain(fmtK(a.years[0]!.run));
    expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Calculated on');
  });
  it('an unscheduled product is excluded, with the note; Product view is today\'s section', async () => {
    mountApp('run'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Agentic Run — Recurring costs — Portfolio/);
    expect(bodyRows(/Recurring costs by product/)).toHaveLength(2);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    view({ kind: 'product' });
    await sectionReady(/^Agentic Run — Recurring costs$/);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
  });
});

describe('Economics > Annual summary: aggregate view', () => {
  it.each([0, 1, 2])('scope %i: years, headline cards and net by product are the domain figures', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('annual'); view(scope);
    await sectionReady(new RegExp(`Annual summary — ${name}`));
    const a = aggregateAnnual(pf(), consolidate(pf()), scope)!;
    expect(stat('Net')).toBe(fmtK(a.headline.net));
    expect(stat('ROI (net)')).toBe(fmtRoiPct(a.headline.roi));
    expect(bodyRows(/Annual table by calendar year/)).toHaveLength(a.years.length);
    expect(totalRow(/Annual table by calendar year/).textContent).toContain(fmtK(a.totals.net));
    expect(bodyRows(/Net by product and calendar year/)).toHaveLength(n);
    expect(totalRow(/Net by product and calendar year/).textContent).toContain(fmtK(a.totalNet[0]!));
    expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Calculated on');
  });
  it('an unscheduled product leaves its wave and is excluded from the Portfolio, with the note; Product view is today\'s section', async () => {
    mountApp('annual'); view({ kind: 'wave', id: waves[0] }); act(() => { assignWave(ids[1], null); });
    await sectionReady(/Annual summary — Wave 1/);
    expect(bodyRows(/Net by product/)).toHaveLength(1);
    expect(screen.queryByText(/Excluded from the figures/)).toBeNull();
    view({ kind: 'portfolio' });
    await sectionReady(/Annual summary — Portfolio/);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('B');
    view({ kind: 'product' });
    await sectionReady(/^Annual summary$/);
    expect(document.querySelector('.ac-agg-table')).toBeNull();
  });
});

describe('Economics > Monthly detail: aggregate view', () => {
  it.each([0, 1, 2])('scope %i: one line per calendar month, cumulative cash and chart lines are the domain figures', async (i) => {
    const { name, scope, n } = scopes()[i]!;
    mountApp('monthly'); view(scope);
    await sectionReady(new RegExp(`Monthly detail — ${name}`));
    const a = aggregateMonthly(pf(), consolidate(pf()), scope)!;
    expect(stat('Net')).toBe(fmtK(a.headline.net));
    const rows = bodyRows(/Monthly table/);
    expect(rows).toHaveLength(a.months.length);
    expect(rows[rows.length - 1]!.textContent).toContain(fmtE(a.months[a.months.length - 1]!.cum));
    expect(document.querySelector(`canvas[data-series*="Cumulative cash"], canvas[aria-label*="Cumulative cash by calendar month"]`)!.getAttribute('data-series')).toContain(':');
    expect(a.chart.series).toHaveLength(1 + n);
    expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Calculated on');
  });
  it('an unscheduled product is excluded, with the note; Product view is today\'s section', async () => {
    mountApp('monthly'); view({ kind: 'portfolio' }); act(() => { assignWave(ids[2], null); });
    await sectionReady(/Monthly detail — Portfolio/);
    expect(screen.getByText(/Excluded from the figures/).textContent).toContain('C');
    view({ kind: 'product' });
    await sectionReady(/Monthly detail \(36 \/ 60 months\)/);
    expect(document.querySelector('.ac-agg-table')).toBeNull();
  });
});
