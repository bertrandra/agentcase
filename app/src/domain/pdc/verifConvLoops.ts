/** @calc-zone verification */
import type { Ctx } from '../ctx';
import { evtModel } from '../model/evt';
import { lceLoops, lceModel } from '../model/lce';
import { vtaxAvgHuman } from '../model/vtax';
import { activeArtefacts } from '../scope';
import { audit, type ConvCheck } from './verifConvTypes';

/**
 * P1 loop-calibration (CC-LC-*) and P2 endogenous verification-tax (CC-VT-*) audits. All gate on their phase flag (lce / evt), so
 * they hold trivially while the phase is off. CC-VT-01 and CC-VT-05 are construction invariants (they guard a future edit of the
 * floor / bound, not a live risk) and CC-VT-03 follows from VT-01 by arithmetic: none can fail with the shipped tables.
 */
export function loopChecks(c: Ctx): ConvCheck[] {
  const on = c.s.MODEL.FLAGS.lce, m = on ? lceModel(c) : null, st = on ? lceLoops(c).loops : [];
  const ids = (list: { id: string }[]) => list.map((l) => l.id).join(', ');
  const outside = m ? m.loops.filter((l) => !(l.EN >= 1 - 1e-9 && l.EN <= m.nMax + 1e-9)) : [];
  const uncal = m ? m.loops.filter((_, i) => { const s = st[i]; return (s ? s.calibResidual : 0) >= 1e-9 || (s ? !!s.clamped : false); }) : [];
  const hi = m ? m.loops.filter((l) => l.escapePct > 5) : [];
  return [
    audit('CC-LC-01', outside.length ? `E[N] outside [1, nMax] for: ${ids(outside)}` : null),
    audit('CC-LC-02', uncal.length ? `uncalibrated / clamped loop(s): ${ids(uncal)}` : null),
    audit('CC-LC-03', hi.length ? `escape rate >5% — fallback must be costed: ${hi.map((l) => `${l.id} ${l.escapePct.toFixed(1)}%`).join(', ')}` : null),
  ];
}

export function taxChecks(c: Ctx): ConvCheck[] {
  const on = c.s.MODEL.FLAGS.evt, ev = c.s.MODEL.EVT, e = on ? evtModel(c) : null;
  const rawNet = e ? e.rate - vtaxAvgHuman(c) : 0, derived = on ? activeArtefacts(c.a, c.s).filter((a) => !ev.classMap[a.id]).length : 0;
  const badGamma = e ? e.classes.filter((k) => k.gamma < 1 - 1e-9) : [];
  return [
    audit('CC-VT-01', e && !(e.rate + 1e-9 >= e.phiWeighted) ? `raw V (${e.rate.toFixed(4)}) below Vfloor (${e.phiWeighted.toFixed(4)})` : null),
    audit('CC-VT-02', e && ev.mode === 'net' && rawNet < 0 && !ev.ackNegativeNet
      ? `net tax would be negative (${rawNet.toFixed(4)}) — set MODEL.EVT.ackNegativeNet to allow it, else it is clamped to 0` : null),
    audit('CC-VT-03', e && !(1 - e.rate <= e.rhoMax + 1e-9) ? `implied savings ratio (${(1 - e.rate).toFixed(4)}) exceeds ρmax (${e.rhoMax.toFixed(4)})` : null),
    audit('CC-VT-04', derived > 0
      ? `${derived} in-scope artefact(s) using the derived default classification (no explicit MODEL.EVT.classMap override) — seed φ/κ values, review before quoting` : null),
    audit('CC-VT-05', badGamma.length ? `γ(C) < 1 for: ${badGamma.map((k) => k.id).join(', ')}` : null),
  ];
}
