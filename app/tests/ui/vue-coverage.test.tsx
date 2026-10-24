// @vitest-environment jsdom
import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SECTION_AGGREGATES } from '@/ui/sections/aggregates';
import { SECTION_KIND_IDS, sectionKind, type SectionKind } from '@/ui/zones/sectionScope';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp } from '../helpers/portfolioUi';
import { view } from '../helpers/vueEPV';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** What each kind says in its banner (the View selector decides the rest of the sentence). */
const BANNER: Record<SectionKind, RegExp> = {
  'R-conso': /Calculated on/, 'R-rollup': /Calculated on/, 'I-input': /Changing/, 'S-static': /Independent of the view/, 'P-portfolio': /Portfolio level/,
};
let waves: [string, string];
beforeEach(() => { ({ waves } = threeProducts()); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('coverage: all 85 sections follow the View — Portfolio and Wave', () => {
  it('every result and input section has its own aggregate (nothing is left on the generic fallback)', () => {
    const missing = SECTION_KIND_IDS.filter((id) => ['R-conso', 'R-rollup', 'I-input'].includes(sectionKind(id)) && !SECTION_AGGREGATES[id]);
    expect(missing).toEqual([]);
  });
  it.each(SECTION_KIND_IDS.flatMap((id) => [[id, 'portfolio'], [id, 'wave']] as const))('%s under %s: renders, says what it is calculated on, no placeholder', async (id, kind) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mountApp(id); view(kind === 'wave' ? { kind: 'wave', id: waves[0] } : { kind: 'portfolio' });
    await waitFor(() => expect(document.querySelector('.ac-scope-banner')).not.toBeNull(), { timeout: 20000 });
    expect(document.querySelector('.ac-scope-banner')!.textContent).toMatch(BANNER[sectionKind(id)]);
    expect(document.body.textContent).not.toMatch(/coming soon|Consolidated view coming/i);
    expect(document.querySelectorAll('h1').length).toBeLessThanOrEqual(1);
    expect(errors).not.toHaveBeenCalled();
  }, 60000);
});
