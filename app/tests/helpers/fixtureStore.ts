import { readFileSync } from 'node:fs';
import { createAppStore, type AppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';

/** The four fixtures every section is compared on (legacy text of the section, dumped by tools/section-text.mjs). */
export const PARITY_FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

/** Install a store holding an oracle case (legacy snapshot state) as the application store. */
export function loadFixture(id: string): AppStore {
  const s = createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), { now: () => 0 });
  setAppStore(s);
  return s;
}
