// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplayScope } from '@/domain/portfolio';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, sectionReady } from '../helpers/portfolioUi';
import { view } from '../helpers/vueEPV';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** The ten sections of the economics, present and verdict groups: [id, heading]. */
const SECTIONS: [string, RegExp][] = [
  ['run', /Agentic Run/], ['annual', /Annual summary/], ['monthly', /Monthly detail/], ['financial', /Financial Summary/],
  ['monthly-playback', /Monthly Playback/], ['commercial', /Commercial model/], ['story-summary', /The story so far/],
  ['results', /Results — consolidated outcome/], ['decision', /Decision Intelligence/], ['strategies', /Strategy comparison/],
];
let waves: [string, string];
beforeEach(() => { ({ waves } = threeProducts()); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('every section of economics / present / verdict renders under the Portfolio and under a Wave', () => {
  it.each(SECTIONS.flatMap(([id, title]) => [[id, title, 'portfolio'], [id, title, 'wave']] as const))('%s — %s — %s', async (id, title, kind) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const scope: DisplayScope = kind === 'wave' ? { kind: 'wave', id: waves[0] } : { kind: 'portfolio' };
    mountApp(id); view(scope);
    await sectionReady(new RegExp(`${title.source}.*${kind === 'wave' ? 'Wave 1' : 'Portfolio'}|Decision Intelligence`));
    expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Calculated on');
    expect(screen.queryByText(/coming soon|Consolidated view coming/i)).toBeNull();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(errors).not.toHaveBeenCalled();
  });

  it.each(SECTIONS)('%s — Product view is the section as it is, no aggregate', async (id, title) => {
    mountApp(id); view({ kind: 'portfolio' }); view({ kind: 'product' });
    await sectionReady(title);
    expect(document.querySelector('.ac-agg-table, .ac-drill')).toBeNull();
    expect(document.querySelector('.ac-scope-banner')!.textContent).not.toContain('Consolidated');
  });
});
