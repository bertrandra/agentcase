import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { computeCase } from '@/domain';
import { createAppStore, type AppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';

/** The four fixtures whose legacy section text was dumped (tools/section-text.mjs). */
export const SECTION_FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'] as const;

/** Install the oracle fixture `id` (a legacy snapshot) as the application store. */
export function loadFixture(id: string): AppStore {
  const s = createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), { now: () => 0 });
  setAppStore(s);
  return s;
}
export const expectedModel = (id: string) => JSON.parse(readFileSync(`fixtures/expected/${id}.json`, 'utf8')).model as { yearSav: number[]; yearRun: number[]; ramps: number[]; auto: number; ceiling: number; eff: number };
export const modelOf = (s: AppStore) => computeCase(s.getState().doc).model;

/** Assert the live case reproduces the legacy figures of oracle fixture `id` (all three yearly savings, to 1e-6). */
export function expectLikeFixture(s: AppStore, id: string): void {
  const got = modelOf(s), exp = expectedModel(id);
  exp.yearSav.forEach((v, i) => expect(Math.abs((got.yearSav[i] as number) - v)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(v))));
  expect(got.ramps).toEqual(exp.ramps);
}
