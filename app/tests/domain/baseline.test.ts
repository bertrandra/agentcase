import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { makeCtx, type CaseState } from '@/domain';
import { apportionFTE } from '@/domain/baseline/apportion';
import { classTargetPct, targetMix } from '@/domain/baseline/locStrat';
import { alignTeamRows, buildTeamRows, scaleRows } from '@/domain/baseline/teamMix';
import { teamWeights } from '@/domain/baseline/teamWeights';
import { locationMix, targetBlendedTJM, teamInCost } from '@/domain/location';
import { nearDiff } from '../helpers/near';

const read = (kind: string, id: string) => JSON.parse(readFileSync(`fixtures/${kind}/${id}.json`, 'utf8'));
const ids = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med', 'team-large', 'target-loc-offshore', 'baseline-pins-med', 'baseline-mixed-team'];
const check = (exp: unknown, got: unknown) => expect(nearDiff(exp, JSON.parse(JSON.stringify(got))).slice(0, 8)).toEqual([]);

describe('baseline domain reproduces the legacy extras', () => {
  it('apportionFTE (largest remainder)', () => {
    expect(existsSync('fixtures/extras/baselineApportion/golden.json')).toBe(true);
    const got = [apportionFTE([3, 2, 1], 10), apportionFTE([0, 0, 0], 7.5), apportionFTE([5.5, 0.2, 12], 15), apportionFTE([1, 1, 1], 0.5), apportionFTE([], 4), apportionFTE([2, 3], 0)];
    check(read('extras/baselineApportion', 'golden'), got);
  });
  describe.each(ids)('%s', (id) => {
    const s = read('cases', id) as CaseState, c = makeCtx(s);
    it('team weights, implied FTE and unstaffed weight', () => {
      const w = teamWeights(c), e = read('extras/baselineTeamWeights', id);
      check(e, { ...w, unassigned: w.unassigned, pin: w.pin });
    });
    it('location mix, blended rate and class targets', () => {
      const mx = locationMix(s), e = read('extras/baselineLocation', id);
      check(e.mix.byLoc, mx.byLoc); check(e.mix.byClass, mx.byClass); check(e.mix.tot, mx.tot);
      check(e.tjm, targetBlendedTJM(s)); check(e.target, targetMix(s));
      check(e.cls, { Local: classTargetPct(s, 'Local'), Nearshore: classTargetPct(s, 'Nearshore'), Offshore: classTargetPct(s, 'Offshore') });
      check(e.asis, teamInCost(s, c.inp));
    });
    it('build from artefacts, align to mix, scale the total', () => {
      check(read('extras/baselineBuild', id), buildTeamRows(c));
      check(read('extras/baselineAlign', id), alignTeamRows(c) ?? s.teamIn);
      check(read('extras/baselineScale', id), scaleRows(s.teamIn, 23.3) ?? s.teamIn);
    });
  });
});
