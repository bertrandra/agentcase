import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import type { CaseState } from '@/domain';
import { evtBaseP, evtModel } from '@/domain/model/evt';
import { evlModel } from '@/domain/model/evidence';
import { flowModel } from '@/domain/model/flow';
import { lceModel } from '@/domain/model/lce';
import { runMcs } from '@/domain/model/mcs';
import { doraReadout, supModel } from '@/domain/model/supView';
import { legacyNames, withoutDeviations } from '../helpers/deviations';
import { diffValues, extraIds, loadCase, loadExtra, omitDeep, pick } from '../helpers/oracleDiff';

type Json = Record<string, unknown> & { error?: string };
const ids = extraIds('me_sup');
const ctxOf = (id: string) => makeCtx(loadCase<CaseState>(id));
const NOW = Date.parse('2026-10-21');
/** Compare a legacy read-out with ours (labels are catalogue text, not figures). */
const same = (name: string, id: string, got: (id: string) => unknown, keys?: string[]) => {
  const exp = loadExtra<Json>(name, id);
  if (exp.error) return;   // the legacy read-out itself threw on this fixture (the empty-scope edge case)
  expect(withoutDeviations(diffValues(omitDeep(keys ? pick(exp, keys) : exp, ['label', 'allZero', 'legacyIter', 'residual', 'clamped']), got(id), name), id)
    .slice(0, 8)).toEqual([]);
};

describe('Model-Engine read-outs reproduce the legacy oracle', () => {
  it('has fixtures for the flags (me-*) and the base cases', () => { expect(ids.length).toBeGreaterThanOrEqual(50); expect(ids).toContain('me-mcs'); });
  it.each(ids)('P1 loop convergence · %s',
    (id) => same('me_lce', id, (i) => lceModel(ctxOf(i)), ['loops', 'nMax', 'calibrated', 'weightedEN', 'escapePct', 'reviewShare']));
  it.each(ids)('P2 verification tax · %s', (id) => same('me_evt', id, (i) => ({ ...evtModel(ctxOf(i)), baseP: evtBaseP(ctxOf(i)) }),
    ['classes', 'totalW', 'phiWeighted', 'kappaTerm', 'rate', 'rhoMax', 'baseP']));
  it.each(ids)('P3 supervision · %s',
    (id) => same('me_sup', id, (i) => supModel(ctxOf(i)), ['provision', 'constrained', 'mode', 'esup', 'vMax', 'vfteRaw', 'vfteEff', 'esupNeeded',
      'supervisorsToUnlock']));
  it.each(ids)('P3 DORA read-out · %s', (id) => same('me_dora', id, (i) => doraReadout(ctxOf(i))));
  it.each(ids)('P5 flow and value · %s', (id) => same('me_flow', id, (i) => flowModel(ctxOf(i))));
  it.each(ids)('P6 evidence ledger, equal weights · %s', (id) => same('me_evlNoRun', id, (i) => {
    const e = evlModel(ctxOf(i), null, NOW);
    return { ...e, confidence: { score: e.score, grade: e.grade, hasTornado: e.hasTornado } };
  }, ['on', 'stage', 'expectedGrade', 'confidence', 'meetsExpectation']));
  it.each(ids)('P6 evidence ledger weighted by the P4 tornado · %s', (id) => same('me_evlRun', id, (i) => {
    const mc = loadExtra<Json>('me_mcs', i);
    const e = evlModel(ctxOf(i), (mc.tornado ?? null) as { id: string; swing: number }[] | null, NOW);
    return { ...e, confidence: { score: e.score, grade: e.grade, hasTornado: e.hasTornado },
      upgradePriority: e.upgradePriority.map((u) => ({ ...u, tier: u.effectiveTier })) };
  }, ['stage', 'expectedGrade', 'confidence', 'meetsExpectation', 'upgradePriority']));
  it.each(['golden', 'me-mcs', 'me-sup-hard', 'me-lce', 'curve-logistic', 'horizon-5', 'sup-hard',
    'evt-on'])('P4 stochastic layer (seed 777, 300 draws) · %s', (id) => {
    same('me_mcs', id, (i) => legacyNames(runMcs(ctxOf(i), 300, 777)));
  }, 60000);
});
