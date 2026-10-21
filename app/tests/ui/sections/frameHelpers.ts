import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { createAppStore, type AppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

export const FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'] as const;

/** Install a store holding a legacy fixture case (fixtures/cases/<id>.json) as the application store. */
export function loadFixture(id: string): AppStore {
  const s = createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), { now: () => 0 });
  setAppStore(s);
  return s;
}

/** Figures the legacy section showed for a fixture that are missing from the rendered tree. */
export function parityGap(fixture: string, section: string, container: Element, ignore: number[] = []): number[] {
  const legacy = legacySectionText(fixture, section);
  expect(legacy).not.toBeNull();
  return missingNumbers(legacy!, renderedText(container), ignore);
}
