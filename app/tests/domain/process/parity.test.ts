import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { editedArtefacts, workingArtefacts } from '@/domain/artefacts';
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { resolveProduct, type Portfolio } from '@/domain/portfolio';
import { normalKeys, processFromCase, readProcess, scopeKeysOf, scopeOf, viewsOf, type LegacyScope, type ScopeKeys } from '@/domain/process';
import type { CaseState } from '@/domain';
import { phasesWithSeq } from '@/domain/verifyB/phases';
import { ctxOf } from '@/domain/portfolio/memo';
import { appStore } from '@/store/instance';
import { DEFAULT_SCOPE } from '@/store/persistence/bpmn/caseDoc';
import { openChecked } from '@/store/persistence/schema';
import { loadFixture } from '../../helpers/fixtures';
import { fourProducts, openPortfolioFixture, regulatedPortfolio } from '../../helpers/portfolioFixtures';

/**
 * Phase B1 gate kept (docs/SPEC_BPMN.md § 6.2): `processFromCase` writes a version 2 file's keys EXACTLY (order, repeats and unknown ids
 * included). Phase B3 gate (§ 6.1, § 13): the case stores the document only; `scopeOf(case)` (the views of `case.BPMN`) equals the version 2 keys the
 * migration computed from the file, in their normal form (document order, complete edit lists: `normalKeys`), the same values as sets and the same
 * artefacts / phases for the engine.
 */
const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const raw = (id: string): Record<string, unknown> => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as Record<string, unknown>;
const KEYS = ['selectedArtefacts', 'artefactsEdited', 'selectedRegArtefacts', 'regArtefactsEdited', 'phaseOff', 'selectedNorms', 'phaseSeq', 'regInclude',
  'skillMap'] as const;
/** The v2 keys exactly as the file holds them (absent keys stay absent). */
const v2 = (c: Record<string, unknown>): Partial<ScopeKeys> => Object.fromEntries(KEYS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]));
/** Without the weight `w` (the engine rewrites it as effort × lifecycle weight). */
const noW = <T extends { w?: number }>(xs: T[]): Omit<T, 'w'>[] => xs.map((x) => { const { w, ...rest } = x; void w; return rest; });
const sorted = (xs: readonly string[]): string[] => [...xs].sort();

/** The migration's keys (a missing key takes the default case's value, as the version 2 reader filled it), normalised. */
const migratedKeys = (c: Record<string, unknown>, base: LegacyScope = DEFAULT_SCOPE): ScopeKeys =>
  normalKeys(readProcess(processFromCase({})), scopeKeysOf({ ...base, ...v2(c) } as LegacyScope));

/** What the version 2 engine computed from the keys: the artefact lists with the edits applied, the selections as sets, the ramp-up phases. */
function expectSameScope(k: ScopeKeys, legacy: ScopeKeys): void {
  expect(sorted(k.selectedArtefacts)).toEqual(sorted(legacy.selectedArtefacts));
  expect(sorted(k.selectedRegArtefacts)).toEqual(sorted(legacy.selectedRegArtefacts));
  expect(sorted(k.selectedNorms)).toEqual(sorted(legacy.selectedNorms));
  expect(sorted(k.phaseOff)).toEqual(sorted(legacy.phaseOff));
  expect(k.regInclude).toBe(legacy.regInclude);
  expect(k.skillMap).toStrictEqual(legacy.skillMap);
  expect(new Map((k.phaseSeq ?? []).map((e) => [e.id, e.seq]))).toEqual(new Map((legacy.phaseSeq ?? []).map((e) => [e.id, e.seq])));
  expect(editedArtefacts(SDLC_ARTEFACTS, k.artefactsEdited)).toStrictEqual(editedArtefacts(SDLC_ARTEFACTS, legacy.artefactsEdited));
  expect(editedArtefacts(REG_ARTEFACTS, k.regArtefactsEdited)).toStrictEqual(editedArtefacts(REG_ARTEFACTS, legacy.regArtefactsEdited));
}

describe('B1 parity kept: viewsOf(processFromCase(file)) == the version 2 keys of the file, exactly', () => {
  it('has the 107 oracle fixtures', () => expect(ids.length).toBe(107));
  it.each(ids)('fixture file %s', (id) => {
    const c = raw(id);
    expect(viewsOf(processFromCase(c)).keys).toStrictEqual(v2(c));
    expect(scopeKeysOf(c)).toStrictEqual(v2(c));
  });
});

describe('B3 parity: scopeOf(case.BPMN) == the version 2 keys computed by the migration (normal form), same values for the engine', () => {
  it.each(ids)('fixture %s opened (migration 2 -> 3)', (id) => {
    const c = raw(id), pf = openChecked(c).portfolio, doc = resolveProduct(pf, pf.activeProductId), k = scopeOf(doc);
    for (const key of KEYS) expect(key in doc, key).toBe(false);
    expect(k).toStrictEqual(migratedKeys(c));
    expectSameScope(k, scopeKeysOf({ ...DEFAULT_SCOPE, ...v2(c) } as LegacyScope));
    const w = workingArtefacts(doc);
    expect(noW(viewsOf(doc.BPMN).sdlc)).toStrictEqual(noW(w.sdlc));
    expect(noW(viewsOf(doc.BPMN).reg)).toStrictEqual(noW(w.reg));
    expect(phasesWithSeq(ctxOf(doc))).toStrictEqual(viewsOf(doc.BPMN).phasesWithSeq);
  });
  it.each(ids)('fixture %s as loaded by the test store', (id) => {
    const s = loadFixture(id), pf = s.getState().portfolio;
    expect(scopeOf(resolveProduct(pf, pf.activeProductId))).toStrictEqual(migratedKeys(raw(id)));
  });
});

/** Every product: its document gives back its keys in normal form (idempotent), and the engine's artefacts are the edited catalogue. */
function everyProduct(pf: Portfolio): void {
  for (const p of pf.products) {
    const c = resolveProduct(pf, p.id) as CaseState, k = scopeOf(c);
    expect(normalKeys(readProcess(c.BPMN), k)).toStrictEqual(k);
    expect(noW(workingArtefacts(c).sdlc)).toStrictEqual(noW(editedArtefacts(SDLC_ARTEFACTS, k.artefactsEdited) as never[]));
  }
}
describe('B3 parity on the portfolio fixtures: every product effective case', () => {
  it('pf-three-products (fixtures/portfolios, a version 2 file: product overrides become whole-document overrides)', () => {
    const file = JSON.parse(readFileSync('fixtures/portfolios/pf-three-products.json', 'utf8')) as { common: Record<string, unknown>;
      products: { id: string; overrides: Record<string, unknown> }[] };
    const pf = openPortfolioFixture('pf-three-products');
    everyProduct(pf);
    for (const p of file.products) {
      const legacy = { ...DEFAULT_SCOPE, ...v2(file.common), ...v2(p.overrides) } as LegacyScope;
      expect(scopeOf(resolveProduct(pf, p.id))).toStrictEqual(normalKeys(readProcess(processFromCase({})), scopeKeysOf(legacy)));
    }
  });
  it('four products with overrides of every kind', () => everyProduct(fourProducts()));
  it('regulated portfolio (industry-med, a product with its own norms)', () => everyProduct(regulatedPortfolio()));
  it('the active store document too', () => { fourProducts(); everyProduct(appStore().getState().portfolio); });
});
