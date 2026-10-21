import { readdirSync } from 'node:fs';
import { expect } from 'vitest';
import { extra, legacyText, loadFixture, PARITY_FIXTURES, tablesOf } from './economics';
import { missingNumbers, renderedText } from './parity';

/** Every fixture the verify (second half) legacy renders were recorded for. */
export const VB_FIXTURES = readdirSync('fixtures/extras/vb_dom').map((f) => f.replace('.json', '')).sort();
export { PARITY_FIXTURES, loadFixture };

export interface VbDom {
  kpiCards: string[][]; kpiEco: string[][]; kpiVq: string[][]; kpiComp: string[][]; exec: string[][]; asis: string[][]; prod: string[][]; dora: string[][];
  qual: string[][]; qualInputs: string[]; compCards: string[][]; comp: string[][];
}
/** The legacy DOM read-back (tables, cards) of a fixture. */
export const legacyDom = (id: string): VbDom => extra<VbDom>('vb_dom', id);
/** Table bodies (header row dropped) of a rendered tree, in document order. */
export const bodies = (root: Element): string[][][] => tablesOf(root).map((t) => t.slice(1));

/** Numbers of the legacy section text that the rendered tree does not show (empty = full parity). */
export function parityGaps(fixture: string, section: string, root: Element, ignore: number[] = []): number[] {
  const legacy = legacyText(fixture, section);
  expect(legacy).not.toBeNull();
  return missingNumbers(legacy!, renderedText(root), ignore);
}
