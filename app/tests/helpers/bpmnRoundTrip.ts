/**
 * Round trip of the BPMN reader / writer (docs/SPEC_BPMN.md § 4.4, § 11.2; phase B2): export → parse → write is byte-identical, and the parsed
 * export gives back the version 2 keys of the case (`viewsOf`). The reader needs a DOMParser: test files using this helper run in jsdom.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { exportCaseText, indent, serialize, viewsOf, type ScopeKeys, type XDocument } from '@/domain/process';
import type { CaseState } from '@/domain';
import { parseBpmn } from '@/store/persistence/bpmn/read';

export const FIXTURE_IDS = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
export const rawFixture = (id: string): CaseState => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const KEYS = ['selectedArtefacts', 'artefactsEdited', 'selectedRegArtefacts', 'regArtefactsEdited', 'phaseOff', 'selectedNorms', 'phaseSeq', 'regInclude',
  'skillMap'] as const;
/** The v2 keys exactly as the case holds them (absent keys stay absent). */
export const v2Keys = (c: CaseState): Partial<ScopeKeys> => {
  const o = c as unknown as Record<string, unknown>;
  return Object.fromEntries(KEYS.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])) as Partial<ScopeKeys>;
};

/** Parses a text that must be accepted with the default F-B10 limits, with no error. */
export function parsed(text: string): XDocument {
  const r = parseBpmn(text);
  expect(r.errors).toEqual([]);
  if (!r.doc) throw new Error('not parsed');
  return r.doc;
}

/** The B2 round-trip assertions on one exported text (`keys`: the v2 keys its views must give back, for a full export). */
export function expectRoundTrip(text: string, keys?: Partial<ScopeKeys>): XDocument {
  const d = parsed(text);
  expect(serialize(d) === text, 'export → parse → write is byte-identical').toBe(true);
  expect(serialize({ ...d, root: indent(d.root) }) === text, 'the export is in canonical indented form').toBe(true);
  if (keys) expect(viewsOf(d).keys).toStrictEqual(keys);
  return d;
}

/** One oracle fixture: deterministic export, round trip, views == v2 keys. */
export function fixtureRoundTrip(id: string): void {
  const c = rawFixture(id), text = exportCaseText(c);
  expect(exportCaseText(rawFixture(id)) === text, 'deterministic (F-B4)').toBe(true);
  expectRoundTrip(text, v2Keys(c));
}

/** The fixtures of shard `k` of `n` (the 107 fixtures are split over several test files so that workers run them in parallel). */
export const shard = (k: number, n: number): string[] => FIXTURE_IDS.filter((_, i) => i % n === k);
