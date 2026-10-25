import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import type { Portfolio } from '@/domain/portfolio';
import { viewScopeOf } from '@/store/viewScope';
import { freshStore } from '../store/helpers';
import { variedProducts, type Varied } from './aggFixture';
import { mountApp, pf, sectionReady } from './portfolioUi';

/**
 * What an aggregate must show for a selection, from the DOMAIN (never from the UI): per product row the strings of its cells, and the strings of the
 * total line.
 */
export interface AggExpect { rows: { id: string; cells: string[] }[]; total: string[] }
export interface AggCase { id: string; title: RegExp; table: RegExp; expected: (pf: Portfolio, ids: string[]) => AggExpect; edit?: boolean }

export const view = (kind: 'portfolio' | 'wave' | 'product', id = ''): void => { act(() => { setDisplayScope(kind === 'wave' ? { kind, id } : { kind }); }); };
const idsOf = (v: Varied, k: 'portfolio' | 'wave'): string[] => viewScopeOf(pf(), k === 'portfolio' ? { kind: 'portfolio' } : { kind: 'wave', id: v.waves[0] }, v.ids[0]).productIds;
const table = (name: RegExp) => screen.getByRole('table', { name });

/** The shared checks of the aggregate input views: Portfolio, Wave, exclusions note, Product unchanged, "Edit this product", single product. */
export function describeAggregates(group: string, cases: AggCase[], statics: { id: string; title: RegExp }[] = []): void {
  describe(`Aggregate views — ${group}`, () => {
    let v: Varied;
    beforeEach(() => { v = variedProducts(); });
    afterEach(cleanup);
    for (const c of cases) {
      describe(c.id, () => {
        for (const k of ['portfolio', 'wave'] as const) {
          it(`${k}: one row per product and the figures of the domain`, async () => {
            mountApp(c.id); if (k === 'portfolio') view('portfolio'); else view('wave', v.waves[0]);
            await sectionReady(c.title);
            const ids = idsOf(v, k), want = c.expected(pf(), ids), t = table(c.table);
            expect(t.querySelectorAll('tbody tr')).toHaveLength(ids.length);
            expect(ids).toHaveLength(k === 'portfolio' ? 3 : 2);
            expect(want.rows.map((r) => r.id)).toEqual(ids);
            for (const r of want.rows) {
              const text = t.querySelector(`tbody tr[data-row="${r.id}"]`)!.textContent ?? '';
              for (const cell of r.cells) expect(text, `${c.id} ${r.id}`).toContain(cell);
            }
            const foot = t.querySelector('tfoot tr')!.textContent ?? '';
            for (const s of want.total) expect(foot, `${c.id} total`).toContain(s);
            expect(document.querySelector('.ac-scope-banner')!.textContent).toContain(k === 'portfolio' ? 'Portfolio (3 planned products)' : 'Wave: ');
            expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('aggregate view');
            if (k === 'portfolio') {
              expect(screen.getByText(/Excluded from the figures/).textContent).toContain('D');
              expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('1 unscheduled or archived product excluded from the figures');
            } else expect(screen.queryByText(/Excluded from the figures/)).toBeNull();
          });
        }
        it('Product: the section as before, no aggregate', async () => {
          mountApp(c.id); view('portfolio'); view('product');
          await sectionReady(c.title);
          expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
          expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Changing: product');
        });
        if (c.edit !== false) {
          it('"Edit this product" makes the View that product', async () => {
            mountApp(c.id); view('portfolio');
            await sectionReady(c.title);
            fireEvent.click(screen.getAllByRole('button', { name: 'Edit this product: B' })[0]!);
            expect(pf().activeProductId).toBe(v.ids[1]);
            expect(pf().displayScope).toEqual({ kind: 'product' });
            await sectionReady(c.title);
            expect(document.querySelector('.ac-agg-table')).toBeNull();
          });
        }
      });
    }
    it('every section renders under a Portfolio and under a Wave: banner, no crash, no console error, no "coming soon" note', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mountApp(cases[0]!.id);
      for (const k of ['portfolio', 'wave'] as const) {
        for (const c of cases) {
          if (k === 'portfolio') view('portfolio'); else view('wave', v.waves[0]);
          const { goSection } = await import('@/ui/uiState');
          act(() => goSection(c.id));
          await sectionReady(c.title);
          expect(document.querySelector('.ac-scope-banner'), `${c.id} ${k}`).not.toBeNull();
          expect(document.body.textContent).not.toMatch(/coming soon|Consolidated view/i);
        }
      }
      expect(err).not.toHaveBeenCalled();
      err.mockRestore();
    });
    for (const st of statics) {
      it(`${st.id} (static): renders under a Portfolio and a Wave with the "Independent of the view" banner only`, async () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mountApp(st.id);
        for (const k of ['portfolio', 'wave'] as const) {
          if (k === 'portfolio') view('portfolio'); else view('wave', v.waves[0]);
          await sectionReady(st.title);
          expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Independent of the view');
          expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
        }
        expect(err).not.toHaveBeenCalled();
        err.mockRestore();
      });
    }
    it('a single product: no banner, no aggregate', async () => {
      freshStore();
      mountApp(cases[0]!.id);
      for (const c of cases) {
        const { goSection } = await import('@/ui/uiState');
        act(() => goSection(c.id));
        await sectionReady(c.title);
        expect(document.querySelector('.ac-scope-banner'), c.id).toBeNull();
        expect(document.querySelector('.ac-agg-table'), c.id).toBeNull();
      }
    });
  });
}
