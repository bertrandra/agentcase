import { readFileSync } from 'node:fs';
import { createAppStore, type AppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';

/** Install a fixture case (tools/oracle.mjs snapshot) as the application store. */
export function loadFixture(id: string): AppStore {
  const s = createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), { now: () => 0 });
  setAppStore(s);
  return s;
}
export const PARITY_FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
