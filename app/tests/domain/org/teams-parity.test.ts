import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { derivedTeams, orgOf, teamRowsOf } from '@/domain/org';
import { addSharedLine, effectiveTeam, productTeam, resolveProduct, setSharedAllocation, sharedLines, type Portfolio } from '@/domain/portfolio';
import { openChecked } from '@/store/persistence/schema';
import { FIXTURE_IDS, goldenAndB, SHARED_LINE } from '../../helpers/portfolio';

/**
 * Phase B6b, § 16.3 "Migration (parity)", made the stored form in B10a (schema v5): the teams of the document give back, for every product, the very
 * effective team the engine runs on (`effectiveTeam`): same rows, same values, same order, same identity when nothing is shared; and, opened from
 * a version 2–4 file, the very rows of the file's `teamIn` (107 cases, the three-product portfolio, the shipped example).
 */
const opened = (path: string): Portfolio => openChecked(JSON.parse(readFileSync(path, 'utf8'))).portfolio;
const files = [...FIXTURE_IDS.map((id) => `fixtures/cases/${id}.json`), 'fixtures/portfolios/pf-three-products.json',
  '../docs/examples/AgentCase_Portfolio_Example.json'];

function expectParity(pf: Portfolio): void {
  const teams = derivedTeams(pf);
  for (const p of pf.products) {
    const rows = teamRowsOf(teams, p.id), eff = effectiveTeam(pf, p);
    expect(rows).toStrictEqual(eff);
    if (eff === productTeam(pf, p.id)) expect(rows).toBe(eff);
    expect(resolveProduct(pf, p.id).teamIn).toStrictEqual(rows);
  }
}

describe('derived teams == effective team on every fixture (107 cases, the three-product portfolio, the shipped example)', () => {
  it.each(files)('%s', (f) => {
    const pf = opened(f), raw = JSON.parse(readFileSync(f, 'utf8')) as { teamIn?: unknown; products?: { id: string; teamIn: unknown }[] };
    expectParity(pf);
    if (raw.teamIn) expect(productTeam(pf, 'p1')).toStrictEqual(raw.teamIn);
    // a version 5 file (the shipped example since FX-34) holds the teams in its document, not as keys: parity above is the check
    for (const p of raw.products ?? []) if (p.teamIn !== undefined) expect(productTeam(pf, p.id)).toStrictEqual(p.teamIn);
  }, 30000);
});

describe('derived teams with shared lines (lot 7)', () => {
  it('a shared line becomes a shared team serving its products with their shares; rows identical to effectiveTeam', () => {
    const pf = setSharedAllocation(addSharedLine(goldenAndB(), { ...SHARED_LINE, pins: ['A017'] }), SHARED_LINE.id, 'B', 30);
    const t = derivedTeams(pf).find((x) => x.shared)!;
    expect(t.serves.map((s) => s.productId).sort()).toEqual(Object.keys(sharedLines(pf)[0]!.allocations).sort());
    expect(t.lines[0]!.pins).toEqual(['A017']);
    expectParity(pf);
  });
  it('property: any shares and FTE give the same rows as effectiveTeam', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }), fc.double({ min: 0, max: 50, noNaN: true }),
      (a, b, etp) => { expectParity(setSharedAllocation(setSharedAllocation(addSharedLine(goldenAndB(), { ...SHARED_LINE, etp }), SHARED_LINE.id, 'p1', a),
        SHARED_LINE.id, 'B', b)); }), { numRuns: 60 });
  });
  it('memoised: the same products and lines give the same teams', () => {
    const pf = opened('fixtures/portfolios/pf-three-products.json');
    expect(derivedTeams(pf)).toBe(derivedTeams(pf));
    expect(orgOf(pf, pf.common.BPMN).teams.slice(0, pf.products.length)).toStrictEqual(derivedTeams(pf));
  });
});
