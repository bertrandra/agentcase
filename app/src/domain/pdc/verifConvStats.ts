/** @calc-zone verification-verdict */
import type { Ctx } from '../ctx';
import { EVL_STAGE_LABEL, evlModel } from '../model/evidence';
import { flowModel } from '../model/flow';
import { runMcs } from '../model/mcs';
import { MCS_DRIVER_ORDER, mcsSpec } from '../model/mcsDrivers';
import { evidenceOf, flowOf } from '../model/modelState';
import { model } from '../model/overlay';
import { audit, type ConvCheck, type ConvRuntime } from './verifConvTypes';

/**
 * P4 stochastic layer (CC-MC-*), baseline drift (CC-CB-01), P5 flow (CC-FL-01) and P6 evidence ledger (CC-EV-*) audits.
 *
 * Runtime state: CC-MC-01/02 only evaluate when a run exists (legacy MCS_LAST; `rt.mcsLast`, null on a clean page, so they hold).
 * Side effect reproduced: CC-MC-02 re-runs the simulation twice (min(500, n) draws, same seed), and the legacy `runMcs` stores its
 * result in MCS_LAST — so the evidence weights read by CC-EV-* come from the tornado of that second re-run, not of the original run.
 * CC-MC-03 and CC-EV-02 cannot fail on the shipped drivers / unchanged data.
 */
export function statsChecks(c: Ctx, rt: ConvRuntime): ConvCheck[] {
  const last = rt.mcsLast ?? null, M = c.s.MODEL, out: ConvCheck[] = [];
  let mc01: string | null = null, mc02: string | null = null, tornado = last ? last.tornado : null;
  if (last) {
    const s = last.stats.savY3, ordered = s.p10 <= s.p50 + 1e-9 && s.p50 <= s.p90 + 1e-9;
    if (!(last.seed > 0 && last.n >= 500 && ordered)) mc01 = `seed/draws/ordering violated: seed=${last.seed} n=${last.n} p10=${s.p10.toFixed(0)} p50=${s.p50.toFixed(0)} p90=${s.p90.toFixed(0)}`;
    const a = runMcs(c, Math.min(500, last.n), last.seed), b = runMcs(c, Math.min(500, last.n), last.seed);
    if (!(Math.abs(a.stats.savY3.p50 - b.stats.savY3.p50) < 1e-9 && Math.abs(a.stats.savY3.p10 - b.stats.savY3.p10) < 1e-9)) mc02 = 'same seed produced different output across two runs';
    tornado = b.tornado;
  }
  const undeclared = MCS_DRIVER_ORDER.filter((id) => { const g = mcsSpec(c, id).group; return g !== 'organisational' && g !== 'exogenous'; });
  const m = M.FLAGS.cbd ? model(c) : null;
  const cbOk = !m || (m.cbd.delta >= 0 && m.cbd.delta <= 1 && m.yearSav.every((s, i) => (m.cbd.yearSavAttributable[i] as number) <= s + 1e-6));
  const share = flowOf(M).throughputInShare;
  let fl: string | null = null;
  if (M.FLAGS.flow) {
    if (!(share >= 0 && share <= 100)) fl = 'throughputInShare out of [0,100] bounds';
    else if (share === 0 && Math.abs(flowModel(c).flowNpv) > 1e-6) fl = 'share=0 but flow value is nonzero — the same capacity is being counted as both cost-out and throughput-in';
  }
  const ev = M.FLAGS.evl ? evlModel(c, tornado) : null;
  const untagged = ev ? ev.drivers.filter((d) => d.weight > 1e-9 && !evidenceOf(M).drivers[d.id]).map((d) => d.label) : [];
  const stale = ev ? ev.drivers.filter((d) => d.tier === 'MEASURED' && d.effectiveTier === 'BENCHMARK').map((d) => d.label) : [];
  out.push(audit('CC-MC-01', mc01), audit('CC-MC-02', mc02),
    audit('CC-MC-03', undeclared.length ? `driver(s) missing a correlation group: ${undeclared.join(', ')}` : null),
    audit('CC-CB-01', cbOk ? null : 'delta out of bounds or attributable exceeds gross'), audit('CC-FL-01', fl),
    audit('CC-EV-01', untagged.length ? `material driver(s) with no evidence tier (defaulting to ASSUMPTION): ${untagged.join(', ')}` : null),
    audit('CC-EV-02', stale.length ? `MEASURED without a source or with a stale (>18mo) asOf, used as BENCHMARK instead: ${stale.join(', ')}` : null),
    audit('CC-EV-03', ev && ev.meetsExpectation === false
      ? `grade ${ev.grade} is below the ${ev.expectedGrade} expected at ${EVL_STAGE_LABEL[ev.stage] || ev.stage} - see the upgrade path, not a gate` : null));
  return out;
}
