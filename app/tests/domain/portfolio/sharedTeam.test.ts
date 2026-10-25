import { describe, expect, it } from 'vitest';
import {
  addSharedLine, aggregateTeams, consolidate, corePortfolio, editSharedLine, effectiveTeam, removeProduct, removeSharedLine, resolveProduct,
  runOf, setSharedAllocation, validate, type Portfolio, type SharedTeamLine,
} from '@/domain/portfolio';
import { goldenAndB, SHARED_LINE } from '../../helpers/portfolio';

const two = goldenAndB, LINE = SHARED_LINE;
const shared = (line: SharedTeamLine = LINE): Portfolio => addSharedLine(two(), line);
const etpOf = (pf: Portfolio, id: string): number => runOf(resolveProduct(pf, id)).baseEtp;
const baseCost = (pf: Portfolio): number => pf.products.reduce((a, p) => a + runOf(resolveProduct(pf, p.id)).cost().base, 0);
const diag = (pf: Portfolio) => validate(pf).diagnostics.map((d) => d.code);

describe('shared team lines: resolution (absent = today)', () => {
  it('without shared lines the effective team IS the product team and the resolved case is unchanged', () => {
    const pf = two(), p = pf.products[0]!;
    expect(effectiveTeam(pf, p)).toBe(p.teamIn);
    expect(resolveProduct(pf, 'p1').teamIn).toBe(p.teamIn);
    expect(corePortfolio(pf)).not.toHaveProperty('sharedTeam');
  });

  it('a share adds FTE x share as a marked row after the own rows, only to the products that hold one', () => {
    const pf = shared({ ...LINE, allocations: { p1: 25 } }), own = pf.products[0]!.teamIn;
    const t = resolveProduct(pf, 'p1').teamIn;
    expect(t.slice(0, own.length)).toEqual(own);
    expect(t[own.length]).toMatchObject({ skill: 'Dev', grade: 'B2', loc: 'France', etp: 0.5, shared: 's1' });
    expect(resolveProduct(pf, 'B').teamIn).toBe(pf.products[1]!.teamIn);
    expect(etpOf(pf, 'p1')).toBeCloseTo(etpOf(two(), 'p1') + 0.5, 9);
  });

  it('the resolved case is memoised: same identity while nothing changes, a share edit rebuilds it', () => {
    const pf = shared();
    expect(resolveProduct(pf, 'p1')).toBe(resolveProduct(pf, 'p1'));
    expect(resolveProduct(setSharedAllocation(pf, 's1', 'p1', 40), 'p1')).not.toBe(resolveProduct(pf, 'p1'));
  });
});

describe('shared team lines: no double count', () => {
  it('shares adding up to 100 % count the line FTE once in the portfolio (consolidation, team aggregate)', () => {
    const pf = shared(), none = two();
    expect(consolidate(pf).baseEtp).toBeCloseTo(consolidate(none).baseEtp + LINE.etp, 9);
    const agg = aggregateTeams(pf, ['p1', 'B']);
    expect(agg.total).toBeCloseTo(aggregateTeams(none, ['p1', 'B']).total + LINE.etp, 9);
    expect(agg.products.map((r) => r.sharedEtp)).toEqual([1, 1]);
  });

  it('the portfolio baseline cost of a shared line equals the cost of the same line held by one product alone', () => {
    const wholeInA = shared({ ...LINE, allocations: { p1: 100 } });
    expect(baseCost(shared())).toBeCloseTo(baseCost(wholeInA), 4);
    expect(baseCost(shared())).toBeGreaterThan(baseCost(two()));
  });
});

describe('shared team lines: operations and validation', () => {
  it('edit, share and remove; the last line removed leaves no field', () => {
    let pf = shared();
    pf = editSharedLine(pf, 's1', 'etp', 4);
    expect(etpOf(pf, 'B')).toBeCloseTo(etpOf(two(), 'B') + 2, 9);
    expect(editSharedLine(pf, 's1', 'etp', -1)).toBe(pf);
    pf = setSharedAllocation(pf, 's1', 'B', 0);
    expect(pf.sharedTeam![0]!.allocations).toEqual({ p1: 50 });
    expect(setSharedAllocation(pf, 's1', 'B', 120)).toBe(pf);
    expect(setSharedAllocation(pf, 's1', 'nope', 10)).toBe(pf);
    expect(addSharedLine(pf, LINE)).toBe(pf);   // duplicate id
    expect(removeSharedLine(pf, 's1')).not.toHaveProperty('sharedTeam');
  });

  it('over-allocation and orphan shares are diagnostics; bad numbers are errors', () => {
    expect(diag(shared())).not.toContain('shared-over');
    expect(diag(shared({ ...LINE, allocations: { p1: 70, B: 50 } }))).toContain('shared-over');
    expect(diag(shared({ ...LINE, allocations: { p1: 50, gone: 50 } }))).toContain('shared-orphan');
    expect(validate(shared({ ...LINE, etp: -1 })).errors.map((e) => e.code)).toContain('shared-line');
    expect(validate(shared({ ...LINE, allocations: { p1: 150 } })).errors.map((e) => e.code)).toContain('shared-share');
    expect(validate(addSharedLine(shared(), { ...LINE, id: 'bad id' })).errors.map((e) => e.code)).toContain('shared-line-id');
  });

  it('deleting a product drops its shares (no orphan left), the other product keeps its own', () => {
    const pf = removeProduct(shared(), 'B');
    expect(pf.sharedTeam![0]!.allocations).toEqual({ p1: 50 });
    expect(diag(pf)).not.toContain('shared-orphan');
  });
});
