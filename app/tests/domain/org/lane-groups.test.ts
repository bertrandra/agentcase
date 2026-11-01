import { describe, expect, it } from 'vitest';
import { laneGroupOf, NOT_MAPPED, orgOf } from '@/domain/org';
import { regroup, type HistRole } from '@/domain/programme/histogram';
import { catalogueProcess } from '@/domain/process';
import { goldenAndB } from '../../helpers/portfolio';

/** SPEC_FIXES FX-16 (F-B76): the histogram's roles grouped by the team, unit or location that staffs them (via the FX-D11 mapping). */
const pf = goldenAndB(), m = orgOf(pf, catalogueProcess());
const roles: HistRole[] = [
  { lane: 'orchestrator', label: 'Orchestrator', days: [1, 2], capacity: 1 },
  { lane: 'aiReviewer', label: 'AI reviewer', days: [3, 4], capacity: 1 },
  { lane: 'finops', label: 'FinOps', days: [5, 6], capacity: null },
];

describe('histogram grouped by organisation', () => {
  it('mapped roles go to the team providing their skill; unmapped roles are grouped apart; the days add up', () => {
    const mapping = new Map([['orchestrator', 'role-dev'], ['aiReviewer', 'role-dev']]);   // the Dev skill is staffed by team-p1
    const byTeam = regroup(roles, laneGroupOf(m, mapping, 'p1', 'team'));
    expect(byTeam.map((g) => g.key)).toEqual(['team-p1', NOT_MAPPED.key]);
    expect(byTeam[0]!.days).toEqual([4, 6]);
    expect(byTeam[1]!.days).toEqual([5, 6]);
    const byUnit = regroup(roles, laneGroupOf(m, mapping, 'p1', 'unit'));
    expect(byUnit[0]!.key).toBe('unit-delivery');
    const byLoc = regroup(roles, laneGroupOf(m, mapping, 'p1', 'location'));
    expect(byLoc[0]!.key.startsWith('loc:')).toBe(true);
    const total = (gs: { days: number[] }[]) => gs.reduce((s, g) => s + g.days[0]! + g.days[1]!, 0);
    expect(total(byTeam)).toBe(21); expect(total(byUnit)).toBe(21); expect(total(byLoc)).toBe(21);
  });
});
