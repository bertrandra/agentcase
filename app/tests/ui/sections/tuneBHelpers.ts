import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

/** The four fixtures whose legacy section text was dumped (tools/section-text.mjs). */
export const FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

/** Install a fixture case as the application document. */
export function loadFixture(id: string): void {
  setAppStore(createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')))));
}

/** Every figure the legacy section showed for the fixture is present (within display rounding) in the rendered tree. */
export function expectParity(fixture: string, section: string, container: Element, ignore: number[] = []): void {
  const legacy = legacySectionText(fixture, section);
  expect(legacy, `legacy text of ${section} for ${fixture}`).not.toBeNull();
  // the dump separates cells by tab/newline; a lone tab between "33,413" and "167…" would read as one thousands group: keep cells apart
  const cells = (legacy as string).replace(/[\t\n]+/g, ' ; ');
  expect(missingNumbers(cells, renderedText(container), ignore)).toEqual([]);
}
