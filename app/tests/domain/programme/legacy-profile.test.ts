import { describe, expect, it, vi } from 'vitest';
import { computeCase, engineNow, makeCtx } from '@/domain';
import { monthlySeries } from '@/domain/economics';
import { activeCurve } from '@/domain/model/overlay';
import { thinFor } from '@/domain/time/thin';
import { evaluateStrategies, resultsCore, savingsBreakdown } from '@/domain/verdict';
import { deviationOf } from '../../helpers/deviations';
import { B9B_DEVIATIONS } from '../../helpers/deviationsB9b';
import { diff, extraIds, loadCase, loadExtra } from '../../helpers/extras';
import { FIXTURE_IDS } from '../../helpers/portfolio';

// The legacy programme cost profile injected (tests/helpers/legacyProgramme.ts): the fields the B9b deviations skip in the oracle tests.
vi.mock('@/domain/programme/profile', async (orig) => (await import('../../helpers/legacyProgramme')).legacyProfileMock(orig));

/**
 * BPMN B9b: the oracle fields DEV-B9B-COACHING / -RESOURCES / -SETUP-SPREAD / -HUB-TIMING skip differ ONLY by the programme cost profile. With the
 * legacy profile injected (the four euro setup lines + HRI change + hub setup, spent over months 1–6), every one of them equals the legacy oracle
 * again, unfiltered — so nothing else moved. The B9b profile itself is asserted by profile.test.ts and timing-owner.test.ts.
 */
const skipped = new Set(B9B_DEVIATIONS.flatMap((d) => d.skip));
const ctx = (id: string) => makeCtx(loadCase(id));
/** The mismatch lines left once the deviations other than B9b's are applied (the B9b fields are compared here, unfiltered). */
const B9B = new Set(B9B_DEVIATIONS.map((d) => d.id));
const kept = (out: string[], id: string): string[] => out.filter((l) => !deviationOf(l, id, (d) => B9B.has(d.id)));
const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v, (_k, x) => (x === Infinity ? 'Infinity' : x)));

describe('legacy profile injected: the skipped oracle fields are the legacy ones again', () => {
  it('the deviations skip the setup amount and timing fields', () => {
    for (const f of ['model.setupTotal', 'payback', 'npv', 'econ_monthly[].cum', 'thinNow.npv', 'strategyRanking']) expect(skipped.has(f)).toBe(true);
  });
  it.each(FIXTURE_IDS)('%s: model (setup), payback, NPV', (id) => {
    const exp = JSON.parse(JSON.stringify(loadExtra('../expected', id))) as { model: unknown; payback: unknown; npv: unknown };
    const got = computeCase(loadCase(id)), out: string[] = [];
    diff(exp.model, json(got.model), 'model', out); diff(exp.payback, got.payback, 'payback', out); diff(exp.npv, got.npv, 'npv', out);
    expect(kept(out, id).slice(0, 6)).toEqual([]);
  });
  it.each(extraIds('econ_monthly'))('%s: the monthly cash flow (setup spend, total, cumulative)', (id) => {
    const out: string[] = [];
    diff(loadExtra('econ_monthly', id), json(monthlySeries(engineNow(ctx(id)))), 'econ_monthly', out);
    expect(kept(out, id).slice(0, 6)).toEqual([]);
  });
  it.each(extraIds('thinNow'))('%s: the thin aggregate (NPV, payback, total, input hash aside)', (id) => {
    const c = ctx(id), t = thinFor(c, { curveModelId: activeCurve(c) }, 0.08), out: string[] = [];
    const e = loadExtra('thinNow', id) as Record<string, unknown>;
    diff({ ...e, inputHash: undefined }, { ...json(t) as Record<string, unknown>, inputHash: undefined }, 'thinNow', out);
    expect(kept(out, id).slice(0, 6)).toEqual([]);
  });
  it.each(extraIds('strategyEval'))('%s: the strategies\' computed TCO, net, setup, ROI, payback', (id) => {
    const out: string[] = [];
    diff(loadExtra('strategyEval', id), json(evaluateStrategies(ctx(id))), 'strategyEval', out);
    expect(kept(out, id).slice(0, 6)).toEqual([]);
  });
  it.each(extraIds('resultsCore'))('%s: results core net, ROI, setup, payback', (id) => {
    const c = ctx(id), r = resultsCore(c), out: string[] = [], e = loadExtra('resultsCore', id) as Record<string, unknown>;
    diff({ net: e.net, roi: e.roi, setup: e.setup, payback: e.payback, years: e.years },
      json({ net: r.net, roi: r.roi, setup: r.setup, payback: r.payback, years: savingsBreakdown(c) }), 'resultsCore', out);
    expect(kept(out, id).slice(0, 6)).toEqual([]);
  });
});
