import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { workingArtefacts } from '@/domain/artefacts';
import { resolveProduct, type Portfolio } from '@/domain/portfolio';
import { processFromCase, scopeKeysOf, viewsOf, type ScopeKeys } from '@/domain/process';
import type { CaseState } from '@/domain';
import { phasesWithSeq } from '@/domain/verifyB/phases';
import { ctxOf } from '@/domain/portfolio/memo';
import { appStore } from '@/store/instance';
import { loadFixture } from '../../helpers/fixtures';
import { fourProducts, openPortfolioFixture, regulatedPortfolio } from '../../helpers/portfolioFixtures';

/**
 * Phase B1 gate (docs/SPEC_BPMN.md § 6.2, § 13): the views derived from a case's process document are EXACTLY the version 2 keys the
 * engine reads today, on every oracle fixture and on every product's effective case of the portfolio fixtures.
 */
const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const raw = (id: string): CaseState => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
const KEYS = ['selectedArtefacts', 'artefactsEdited', 'selectedRegArtefacts', 'regArtefactsEdited', 'phaseOff', 'selectedNorms', 'phaseSeq', 'regInclude',
  'skillMap'] as const;
/** The v2 keys exactly as the case holds them (absent keys stay absent). */
const v2 = (c: CaseState): Partial<ScopeKeys> => {
  const o = c as unknown as Record<string, unknown>;
  return Object.fromEntries(KEYS.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])) as Partial<ScopeKeys>;
};
/** Without the weight `w` (the engine rewrites it as effort × lifecycle weight; the catalogue value is checked in default-process.test.ts). */
const noW = <T extends { w?: number }>(xs: T[]): Omit<T, 'w'>[] => xs.map((x) => { const { w, ...rest } = x; void w; return rest; });

/** Views of the case's process == the case's v2 keys, and the derived artefact lists / phases == what the engine computes from those keys. */
function expectParity(c: CaseState): void {
  const v = viewsOf(processFromCase(c)), keys = v.keys;
  expect(keys).toStrictEqual(v2(c));
  expect(scopeKeysOf(c)).toStrictEqual(v2(c));
  const w = workingArtefacts(c);
  expect(noW(v.sdlc)).toStrictEqual(noW(w.sdlc));
  expect(noW(v.reg)).toStrictEqual(noW(w.reg));
  expect(v.phasesWithSeq).toStrictEqual(phasesWithSeq(ctxOf(c)));
}

describe('B1 parity: viewsOf(processFromCase(case)) == the version 2 keys', () => {
  it('has the 107 oracle fixtures', () => expect(ids.length).toBe(107));
  it.each(ids)('fixture file %s', (id) => expectParity(raw(id)));
  it.each(ids)('fixture %s as opened by the store (migrated effective case)', (id) => {
    const s = loadFixture(id), pf = s.getState().portfolio;
    expectParity(resolveProduct(pf, pf.activeProductId));
  });
});

const everyProduct = (pf: Portfolio): void => { for (const p of pf.products) expectParity(resolveProduct(pf, p.id)); };
describe('B1 parity on the portfolio fixtures: every product effective case', () => {
  it('pf-three-products (fixtures/portfolios)', () => everyProduct(openPortfolioFixture('pf-three-products')));
  it('four products with overrides of every kind', () => everyProduct(fourProducts()));
  it('regulated portfolio (industry-med, a product with its own norms)', () => everyProduct(regulatedPortfolio()));
  it('the active store document too', () => { fourProducts(); expectParity(appStore().getState().doc); });
});
