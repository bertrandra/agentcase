import { describe, expect, it } from 'vitest';
import type { DepsData } from '@/domain/zones/graph';
import { plan, triggersFull, type SelectionConfig } from '@/domain/zones/selection';
import { affected, RULE } from '../../scripts/lib/select';

/** The rule that avoids useless tests (docs/TEST_SELECTION.md) on the real graph, and its decision function on a tiny synthetic one. */
const root = process.cwd();
const run = (files: string[], level: 'precise' | 'zone' | 'related' = 'zone') => affected(root, files, level);
const has = (r: { selected: string[] }, t: string): boolean => r.selected.includes(t);

describe('affected tests: selection on the real graph', () => {
  it('a peripheral domain file selects its tests and the contract tests, not the whole suite', () => {
    const r = run(['src/domain/stress/sensitivity.ts']);
    expect(r.full).toBe(false);
    expect(r.zones).toEqual(['stress']);
    expect(has(r, 'tests/domain/stress.test.ts')).toBe(true);
    for (const t of RULE.contractTests.filter((x) => x !== 'tests/domain/figure-owners.test.ts' || r.total > 0)) expect(has(r, t), t).toBe(true);
    expect(has(r, 'tests/domain/fastPath.test.ts')).toBe(false);
    expect(r.saved).toBeGreaterThan(30);
  }, 90000);
  it('precise is a subset of zone, and both include the tests that import the file', () => {
    const p = run(['src/domain/verdict/rank.ts'], 'precise'), z = run(['src/domain/verdict/rank.ts']);
    expect(p.selected.every((t) => has(z, t))).toBe(true);
    expect(p.selected.length).toBeLessThanOrEqual(z.selected.length);
    expect(has(p, 'tests/domain/verdict.test.ts')).toBe(true);
  }, 90000);
  it('a section file selects the section test and the tests that render every section', () => {
    const r = run(['src/ui/sections/refshare/deps/Graph.tsx']);
    expect(r.sections).toEqual(['deps']);
    expect(has(r, 'tests/ui/sections/deps.test.tsx')).toBe(true);
    expect(r.full).toBe(false);
  }, 90000);
  it('the foundation zone, the engine and anything outside the graph run the full suite, with the reason', () => {
    const foundation = run(['src/domain/ctx.ts']);
    expect(foundation.full).toBe(true);
    expect(foundation.reasons.join(' ')).toMatch(/foundation/);
    expect(foundation.selected).toHaveLength(foundation.total);
    for (const f of ['package.json', 'tsconfig.json', 'vite.config.ts', 'tests/helpers/fixtures.ts', 'fixtures/cases/golden.json', 'scripts/dup.mjs', 'src/generated/dependencies.json', 'src/domain/zones/catalog.json']) expect(triggersFull(f, RULE), f).toBe(true);
    expect(run(['some/unknown.cfg']).reasons.join(' ')).toMatch(/unknown file/);
    expect(run(['package.json']).full).toBe(true);
  }, 90000);
  it('a very wide selection becomes the full suite (more than the maxShare)', () => {
    const r = run(['src/domain/time/years.ts']);
    expect(r.full).toBe(true);
    expect(r.reasons.join(' ')).toMatch(/more than 60%/);
  }, 90000);
  it('a document a test reads selects that test (the read is an edge); a document nothing reads selects only the contract tests', () => {
    const r = run(['../docs/VUE_AGREGEE.md']);
    expect(has(r, 'tests/ui/section-scope.test.ts')).toBe(true);
    expect(r.full).toBe(false);
    const none = run(['../docs/TEST_SELECTION.md']);
    expect(none.full).toBe(false);
    expect(none.selected.length).toBeLessThanOrEqual(RULE.contractTests.length + 1);
  }, 90000);
  it('vitest related level follows barrels whole, so it selects at least what zone selects', () => {
    const z = run(['src/domain/portfolio/waveOps.ts']), rel = run(['src/domain/portfolio/waveOps.ts'], 'related');
    expect(rel.full || z.selected.every((t) => has(rel, t))).toBe(true);
  }, 90000);
});

describe('affected tests: the decision function', () => {
  const d = { tests: [['a', '0', ''], ['b', '1', ''], ['c', '0-1', ''], ['k', '', '']], zones: [{ id: 'x', modules: 1, tmed: 0, tmax: 0 }, { id: 'y', modules: 1, tmed: 0, tmax: 0 }], sections: [], edges: [['x', 'y', 'z', 1]], figures: [], ignored: [], schema: 1, counts: { files: 0, tagged: 0, tests: 4 } } as unknown as DepsData;
  const cfg: SelectionConfig = { maxShare: 0.8, contractTests: ['k', 'missing'], fullZones: ['wide'], fullSuite: ['package.json', 'fixtures/'] };
  it('selects the tests touching the zone, the contract tests that exist, and extras', () => {
    expect(plan(d, cfg, ['y'], []).tests).toEqual(['b', 'c', 'k']);
    expect(plan(d, cfg, ['x'], [], ['b']).tests).toEqual(['a', 'b', 'c', 'k']);
  });
  it('goes full on a wide zone or when too much is selected anyway, and says why', () => {
    const wide = plan(d, cfg, ['wide'], []);
    expect(wide.full).toBe(true);
    expect(wide.tests).toHaveLength(4);
    const big = plan(d, { ...cfg, maxShare: 0.5 }, ['x'], []);
    expect(big.full).toBe(true);
    expect(big.reasons[0]).toMatch(/more than 50%/);
  });
  it('reads fullSuite paths as files or folders', () => {
    expect(triggersFull('package.json', cfg) && triggersFull('fixtures/a/b.json', cfg)).toBe(true);
    expect(triggersFull('src/package.json', cfg) || triggersFull('fixtures-x/a', cfg)).toBe(false);
  });
});
