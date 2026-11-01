import { describe, expect, it } from 'vitest';
import { SECTION_AGGREGATES } from '@/ui/sections/aggregates';
import { followsView, sectionKind } from '@/ui/zones/sectionScope';
import { SECTIONS } from '@/ui/zones/registry';

/**
 * SPEC_FIXES FX-50 / FX-51: every section that follows the View (R-conso, R-rollup, I-input) has an aggregate of its own, so no section reaches the
 * generic fallbacks (`ui/zones/fallbacks.tsx`, kept as the safety net of a section added without one).
 */
describe('aggregate views', () => {
  it('every section that follows the View has its own aggregate', () => {
    const missing = SECTIONS.filter((s) => followsView(sectionKind(s.id)) && !SECTION_AGGREGATES[s.id]).map((s) => `${s.id} (${sectionKind(s.id)})`);
    expect(missing).toEqual([]);
    expect(SECTION_AGGREGATES.compliance && SECTION_AGGREGATES.risk).toBeTruthy();
  });
});
