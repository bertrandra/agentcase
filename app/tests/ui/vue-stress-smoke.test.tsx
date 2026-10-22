// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { SECTION_AGGREGATES } from '@/ui/sections/aggregates';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** Smoke test of the 13 aggregate views of the groups stress, model-engine and defend: under a Portfolio and under a Wave, no crash, no console error, the banner, no "coming soon" note. */
const IDS = ['montecarlo', 'scenarios', 'compare', 'sensitivity', 'model-stochastic', 'model-convergence', 'model-supervision', 'model-flow', 'model-evidence', 'model-verification', 'assumptions', 'verif', 'duediligence'];
let waves: [string, string];
beforeEach(() => { ({ waves } = threeProducts()); });
afterEach(cleanup);

describe('aggregate views of stress / model-engine / defend', () => {
  it('every section has a registered aggregate', () => { for (const id of IDS) expect(SECTION_AGGREGATES[id], id).toBeTypeOf('function'); });

  for (const id of IDS) {
    for (const view of ['portfolio', 'wave 1', 'wave 2'] as const) {
      it(`${id} under ${view}`, async () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mountApp(id);
        act(() => setDisplayScope(view === 'portfolio' ? { kind: 'portfolio' } : { kind: 'wave', id: waves[view === 'wave 1' ? 0 : 1] }));
        await screen.findByRole('heading', { level: 1 }, { timeout: 30000 });
        await vi.waitFor(() => expect(document.querySelector('.ac-agg-table, .ac-drill')).not.toBeNull(), { timeout: 30000 });
        expect(document.querySelector('.ac-scope-banner')!.textContent).toMatch(/^Calculated on: (Portfolio|Wave: Wave \d)/);
        expect(document.body.textContent).not.toMatch(/coming|à venir/i);
        expect(document.querySelectorAll('h1')).toHaveLength(1);
        expect(err.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
        err.mockRestore();
      }, 90000);
    }
  }
});
