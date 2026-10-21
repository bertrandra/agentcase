import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { extra, legacyText, loadFixture, PARITY_FIXTURES, statsOf } from './economics';
import { missingNumbers, renderedText } from './parity';

/** The two parity checks every migrated section carries: every legacy figure is shown (4 fixtures), tables and bands match cell by cell (all cases). */
export function parityTests(id: string, Section: ComponentType, o: { ignore?: number[]; skip?: number[]; mask?: RegExp } = {}): void {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />), legacy = legacyText(fx, id);
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container), o.ignore)).toEqual([]);
  });
  it.each(VFA_FIXTURES)('reproduces the legacy tables and summary cell by cell (%s)', (fx) => {
    loadFixture(fx);
    expect(missingVerifyCells(render(<Section />).container, fx, id, o.skip, o.mask)).toEqual([]);
  });
}

export { loadFixture, legacyText, PARITY_FIXTURES } from './economics';

/** Every oracle case the legacy DOM of the first verify half was recorded for. */
export const VFA_FIXTURES = readdirSync('fixtures/extras/vfa_dom').map((f) => f.replace('.json', '')).sort();

interface LegacyDom { tables: string[][][]; bands: string[][]; error?: string }
const clean = (s: string, mask?: RegExp) => { const t = s.replace(/\s+/g, ' ').trim(); return mask ? t.replace(mask, '#') : t; };
const cells = (root: Element, mask?: RegExp): string[][][] => [...root.querySelectorAll('table')].map((t) => [...t.querySelectorAll('tr')].map((r) => [...r.children].map((c) => (c.querySelector('select') ? '' : clean(c.textContent ?? '', mask)))));

/**
 * The legacy tables / summary bands of section `id` (recorded by tools/oracle-extras.d/verifyA.mjs) that the rendered tree does not reproduce
 * cell for cell (cell whitespace ignored). `skip` lists legacy table indexes deliberately not compared. Empty = identical.
 */
export function missingVerifyCells(root: Element, fixture: string, id: string, skip: number[] = [], mask?: RegExp): string[] {
  const leg = extra<Record<string, LegacyDom>>('vfa_dom', fixture)[id] as LegacyDom;
  if (leg.error) return [`legacy error ${leg.error}`];
  const have = cells(root, mask).map((t) => JSON.stringify(t)), stats = statsOf(root).map((s) => JSON.stringify(s.map(clean))), out: string[] = [];
  leg.tables.forEach((t, i) => {
    const j = JSON.stringify(t.map((r) => r.map((c) => clean(c, mask))));
    if (!skip.includes(i) && !have.includes(j)) out.push(`table ${i}: ${j.slice(0, 200)}`);
  });
  leg.bands.forEach((b) => { if (!stats.includes(JSON.stringify(b.map(clean)))) out.push(`band ${JSON.stringify(b)}`); });
  return out;
}
