import { describe, expect, it } from 'vitest';
import { byTeam, orgOf, readRaci, setRaci } from '@/domain/org';
import { catalogueProcess, serialize } from '@/domain/process';
import { goldenAndB } from '../../helpers/portfolio';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';

/**
 * SPEC_FIXES FX-22 (F-B37, § 16.8): an activity may say how its Responsible work splits between teams (`ac:raci teams`); that split then replaces
 * the split by the teams' FTE × share in the team's load (a view: no business-case figure reads it).
 */
const pf = goldenAndB(), base = catalogueProcess(), effortOf = (id: string) => readRaci(base).find((a) => a.id === id)!.effort;

describe('per-activity team split of the Responsible work', () => {
  it('written to ac:raci, read back; a share over 100 % in all, or a bad id, is refused', () => {
    const d = setRaci(base, 'A017', { R: [], C: [], I: [], teams: { 'team-p1': 70, 'team-B': 30 } });
    expect(readRaci(d).find((a) => a.id === 'A017')!.raci.teams).toEqual({ 'team-p1': 70, 'team-B': 30 });
    expect(serialize(d)).toMatch(/<ac:raci [^>]*teams="team-p1:70 team-B:30"/);
    expect(setRaci(base, 'A017', { R: [], C: [], I: [], teams: { 'team-p1': 80, 'team-B': 40 } })).toBe(base);
    expect(setRaci(base, 'A017', { R: [], C: [], I: [], teams: { 'bad id': 10 } })).toBe(base);
    if (schemaTestsRun()) expect(validateText(serialize(d), 'raci-teams.bpmn')).toMatchObject({ schema: 'valid', errors: [] });
  });
  it('the team load takes the activity\'s share of its effort, per product served, instead of the FTE × share split', () => {
    const before = byTeam(orgOf(pf, base), 'team-B')!.load;
    const d = setRaci(base, 'A017', { R: [], C: [], I: [], teams: { 'team-B': 100 } }), m = orgOf(pf, d), t = byTeam(m, 'team-B')!;
    expect(t.activities.map((a) => a.id)).toContain('A017');
    const without = byTeam(orgOf(pf, setRaci(base, 'A017', { R: [], C: [], I: [], teams: { 'team-p1': 100 } })), 'team-B')!.load;
    expect(t.load - without).toBeCloseTo(effortOf('A017') * t.serves.length, 9);
    expect(before).toBeGreaterThanOrEqual(without);
  });
});
