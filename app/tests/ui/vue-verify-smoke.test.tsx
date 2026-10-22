// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { assignWave } from '@/controllers/wave';
import { freshStore } from '../store/helpers';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { VERIFY_IDS } from '../helpers/verifyIds';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

type V = 'portfolio' | 'wave1' | 'wave2' | 'product';
const view = (v: V) => act(() => { setDisplayScope(v === 'portfolio' ? { kind: 'portfolio' } : v === 'product' ? { kind: 'product' } : { kind: 'wave', id: pf().waves[v === 'wave1' ? 0 : 1]!.id }); });
const banner = () => document.querySelector('.ac-scope-banner');
let errors: ReturnType<typeof vi.spyOn>;

beforeEach(() => { threeProducts(); errors = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { errors.mockRestore(); cleanup(); });

describe('verify group: every section renders under the Portfolio and under a Wave', () => {
  it.each(VERIFY_IDS.flatMap(([id, t]) => (['portfolio', 'wave1'] as const).map((v) => [id, t, v] as const)))('%s, %s view: banner, no crash, no "coming soon"', async (id, title, v) => {
    mountApp(id); view(v);
    await sectionReady(title);
    expect(banner()!.textContent).toContain('Calculated on:');
    expect(banner()!.textContent).toContain(v === 'portfolio' ? 'Portfolio (3 planned products)' : 'Wave: Wave 1 (2 planned products)');
    if (id === 'gantt') expect(await screen.findByRole('region', { name: 'Wave Gantt' })).toBeTruthy();
    else expect(document.querySelector('.ac-agg-table')).not.toBeNull();   // the aggregate, not the section
    expect(document.body.textContent).not.toMatch(/coming|à venir/i);
    expect(errors).not.toHaveBeenCalled();
  });

  it.each(VERIFY_IDS)('%s: a wave left with no planned product, and an unscheduled product, still render', async (id, title) => {
    act(() => { assignWave(pf().products[2]!.id, null); });
    mountApp(id); view('wave2');
    await sectionReady(title);
    expect(banner()!.textContent).toContain('Wave: Wave 2 (0 planned product)');
    expect(errors).not.toHaveBeenCalled();
  });

  it.each(VERIFY_IDS)('%s: the Product view is the section as before (no aggregate table, no drill)', async (id, title) => {
    mountApp(id); view('portfolio'); view('product');
    await sectionReady(title);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(banner()!.textContent).toContain('Calculated on: Product: ');
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('verify group: a single product has no banner and no aggregate', () => {
  beforeEach(() => { freshStore(); });
  it.each(VERIFY_IDS)('%s', async (id, title) => {
    mountApp(id);
    await sectionReady(title);
    expect(banner()).toBeNull();
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });
});
