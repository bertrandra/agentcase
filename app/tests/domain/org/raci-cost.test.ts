import { describe, expect, it } from 'vitest';
import { byTeam, orgOf, raciCostByUnit, setRaci } from '@/domain/org';
import { catalogueProcess } from '@/domain/process';
import { goldenAndB } from '../../helpers/portfolio';

/**
 * SPEC_FIXES FX-D7 (a), § 16.5: the RACI-driven load and cost by unit (opt-in view). The units' loads add up to the product's Responsible work
 * done by teams, the costs to the product's team cost; an activity's own team split (FX-22) moves its load to the team it names.
 */
const pf = goldenAndB(), base = catalogueProcess(), COST = 1_000_000;

describe('RACI-driven load and cost by unit', () => {
  it('the costs of the units add up to the team cost of the product, in proportion to their load', () => {
    const m = orgOf(pf, base), x = raciCostByUnit(m, 'p1', COST);
    expect(x.rows.length).toBeGreaterThan(0);
    expect(x.rows.reduce((s, r) => s + r.cost, 0)).toBeCloseTo(COST, 6);
    expect(x.rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 9);
    for (const r of x.rows) expect(r.cost).toBeCloseTo(COST * r.load / x.load, 6);
    expect(x.load).toBeCloseTo(byTeam(m, 'team-p1')!.load, 9);   // one team serves p1: its load is the product's
  });
  it('an activity given wholly to the team of another product leaves the units of this product', () => {
    const before = raciCostByUnit(orgOf(pf, base), 'p1', COST).load;
    const d = setRaci(base, 'A017', { R: [], C: [], I: [], teams: { 'team-B': 100 } }), after = raciCostByUnit(orgOf(pf, d), 'p1', COST).load;
    expect(before - after).toBeCloseTo(orgOf(pf, base).activities.find((a) => a.id === 'A017')!.effort, 9);
  });
  it('no Responsible work: no row, no cost', () => {
    expect(raciCostByUnit({ ...orgOf(pf, base), activities: [] }, 'p1', COST)).toEqual({ rows: [], load: 0, cost: 0 });
  });
});
