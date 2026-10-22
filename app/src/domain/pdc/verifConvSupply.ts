/** @calc-zone verification-verdict */
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { supRampMultiplier, supSpanFor } from '../model/supervision';
import { audit, type ConvCheck } from './verifConvTypes';

/**
 * P3 supervision-capacity audits (CC-SC-*). They gate on the sup flag (and on the 'constrained' / 'provisioned' provision), so they
 * hold trivially while the phase is off. CC-SC-01/04/05 are construction invariants: the engine applies the ceiling in one place
 * (supCeilVfte, in the Time-Engine kernel), so they only fail if that wiring is broken — CC-SC-05 does fail on the soft-cap case
 * of the oracle (sup-soft) because the run-team sizing there is derived from the uncapped vFTE: reproduced, not corrected.
 */
export function supervisionChecks(c: Ctx): ConvCheck[] {
  const M = c.s.MODEL, on = M.FLAGS.sup, constrained = on && M.SUP.provision === 'constrained', m = on ? model(c) : null;
  const eng = constrained && m && m.sup.constrained ? m : null;
  const sc01: string[] = [], sc03: string[] = [];
  if (eng && eng.sup.constrained) {
    const sup = eng.sup;
    eng.yearAgentVfte.forEach((v, i) => {
      const raw = eng.yearAgentVfteRaw[i] as number, vMax = sup.vMax[i] as number;
      if (v > raw + 1e-9) sc01.push(`Y${i + 1} capped ${v.toFixed(3)} > raw ${raw.toFixed(3)}`);
      if (M.SUP.mode === 'hard' && v > vMax + 1e-9) sc01.push(`Y${i + 1} capped ${v.toFixed(3)} > vMax ${vMax.toFixed(3)}`);
      if (vMax > 0 && raw > vMax * 1.001 && v > vMax * 1.001) sc03.push(`Y${i + 1}`);
    });
  }
  const cap = Math.max(1, Math.min(4, M.SUP.rampCap || 2.5));
  const sc02 = on ? [0, 1, 2].filter((i) => supRampMultiplier(c, i) > cap + 1e-9) : [];
  const sc04 = on && m && M.SUP.provision === 'provisioned' && m.yearAgentVfte.some((v, i) => Math.abs(v - (m.yearAgentVfteRaw[i] as number)) > 1e-9);
  const sc05: string[] = [];
  if (on && m && (c.inp.v('runSizeMode') || 'hybrid') !== 'legacy') {
    const span = supSpanFor(c, m.base.etp);
    m.yearAgentVfte.forEach((v, i) => { if (Math.abs((m.yearRunAgenticETP[i] as number) - ((v > 1e-4 ? span.floor : 0) + v * span.rOps)) > 1e-6) sc05.push(`Y${i + 1}`); });
  }
  return [
    audit('CC-SC-01', sc01.length ? sc01.join('; ') : null),
    audit('CC-SC-02', sc02.length ? `ramp multiplier exceeds rampCap for year(s): ${sc02.map((i) => `Y${i + 1}`).join(', ')}` : null),
    audit('CC-SC-03', sc03.length ? `over-committed but cap did not engage: ${sc03.join(', ')}` : null),
    audit('CC-SC-04', sc04 ? 'provisioned mode capped vFTE — it must never cap throughput, only price it' : null),
    audit('CC-SC-05', sc05.length ? `Esup* not derived from the same vFTE the ceiling produced: ${sc05.join(', ')}` : null),
  ];
}
