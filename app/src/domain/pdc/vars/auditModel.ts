/** @calc-zone workspace-config */
import type { Ctx } from '../../ctx';
import { evtModel } from '../../model/evt';
import { ESCAPE_MATERIAL_PCT, escapeMaterial, lceLoops, lceModel } from '../../model/lce';
import { modelOf as model } from '../../tune/memo';
import { supRampMultiplier, supSpanFor } from '../../model/supervision';
import { vtaxAvgHuman } from '../../model/vtax';
import { activeArtefacts } from '../../scope';

/** A logic check of the model layers: the message of the violation, or null when it holds. */
export type AuditCheck = (c: Ctx) => string | null;
const flags = (c: Ctx) => c.s.MODEL.FLAGS;
const list = (xs: string[]) => xs.join(', ');

/** Convergence (CC-LC), verification-tax (CC-VT) and supervision (CC-SC) checks of the legacy AUDIT registry; each is inert while its stage flag is off. */
export const MODEL_CHECKS: [id: string, check: AuditCheck][] = [
  ['CC-LC-01', (c) => {
    if (!flags(c).lce) return null;
    const m = lceModel(c), bad = m.loops.filter((l) => !(l.EN >= 1 - 1e-9 && l.EN <= m.nMax + 1e-9));
    return bad.length ? `E[N] outside [1, nMax] for: ${list(bad.map((l) => l.id))}` : null;
  }],
  ['CC-LC-02', (c) => {
    if (!flags(c).lce) return null;
    const bad = lceLoops(c).loops.filter((l) => l.calibResidual >= 1e-9 || l.clamped);
    return bad.length ? `uncalibrated / clamped loop(s): ${list(bad.map((l) => l.id))}` : null;
  }],
  ['CC-LC-03', (c) => {
    if (!flags(c).lce) return null;
    const hi = lceModel(c).loops.filter(escapeMaterial);
    return hi.length ? `escape rate >${ESCAPE_MATERIAL_PCT}% — fallback must be costed: ${list(hi.map((l) => `${l.id} ${l.escapePct.toFixed(1)}%`))}` : null;
  }],
  ['CC-VT-01', (c) => {
    if (!flags(c).evt) return null;
    const e = evtModel(c);
    return e.rate + 1e-9 >= e.phiWeighted ? null : `raw V (${e.rate.toFixed(4)}) below Vfloor (${e.phiWeighted.toFixed(4)})`;
  }],
  ['CC-VT-02', (c) => {
    if (!flags(c).evt || c.s.MODEL.EVT.mode !== 'net') return null;
    const net = evtModel(c).rate - vtaxAvgHuman(c);
    return net < 0 && !c.s.MODEL.EVT.ackNegativeNet
      ? `net tax would be negative (${net.toFixed(4)}) — set MODEL.EVT.ackNegativeNet to allow it, else it is clamped to 0` : null;
  }],
  ['CC-VT-03', (c) => {
    if (!flags(c).evt) return null;
    const e = evtModel(c);
    return 1 - e.rate <= e.rhoMax + 1e-9 ? null : `implied savings ratio (${(1 - e.rate).toFixed(4)}) exceeds ρmax (${e.rhoMax.toFixed(4)})`;
  }],
  ['CC-VT-04', (c) => {
    if (!flags(c).evt) return null;
    const derived = activeArtefacts(c.a, c.s).filter((a) => !c.s.MODEL.EVT.classMap[a.id]).length;
    return derived > 0
      ? `${derived} in-scope artefact(s) using the derived default classification (no explicit MODEL.EVT.classMap override) — seed φ/κ values, review before quoting` : null;
  }],
  ['CC-VT-05', (c) => {
    if (!flags(c).evt) return null;
    const bad = evtModel(c).classes.filter((k) => k.gamma < 1 - 1e-9);
    return bad.length ? `γ(C) < 1 for: ${list(bad.map((k) => k.id))}` : null;
  }],
  ['CC-SC-01', (c) => {
    const m = model(c), sup = c.s.MODEL.SUP, ms = m.sup;
    if (!flags(c).sup || sup.provision !== 'constrained' || !ms.constrained) return null;
    const bad: string[] = [];
    m.yearAgentVfte.forEach((x, i) => {
      if (x > m.yearAgentVfteRaw[i]! + 1e-9) bad.push(`Y${i + 1} capped ${x.toFixed(3)} > raw ${m.yearAgentVfteRaw[i]!.toFixed(3)}`);
      if (sup.mode === 'hard' && x > (ms.vMax[i] as number) + 1e-9) bad.push(`Y${i + 1} capped ${x.toFixed(3)} > vMax ${(ms.vMax[i] as number).toFixed(3)}`);
    });
    return bad.length ? bad.join('; ') : null;
  }],
  ['CC-SC-02', (c) => {
    if (!flags(c).sup) return null;
    const cap = Math.max(1, Math.min(4, c.s.MODEL.SUP.rampCap || 2.5)), bad = [0, 1, 2].filter((i) => supRampMultiplier(c, i) > cap + 1e-9);
    return bad.length ? `ramp multiplier exceeds rampCap for year(s): ${list(bad.map((i) => `Y${i + 1}`))}` : null;
  }],
  ['CC-SC-03', (c) => {
    const m = model(c), ms = m.sup;
    if (!flags(c).sup || c.s.MODEL.SUP.provision !== 'constrained' || !ms.constrained) return null;
    const bad = m.yearAgentVfteRaw.map((raw,
      i) => ({ raw, i, vm: ms.vMax[i] as number })).filter((x) => x.vm > 0 && x.raw > x.vm * 1.001 && m.yearAgentVfte[x.i]! > x.vm * 1.001);
    return bad.length ? `over-committed but cap did not engage: ${list(bad.map((x) => `Y${x.i + 1}`))}` : null;
  }],
  ['CC-SC-04', (c) => {
    if (!flags(c).sup || c.s.MODEL.SUP.provision !== 'provisioned') return null;
    const m = model(c);
    return m.yearAgentVfte.some((x, i) => Math.abs(x - m.yearAgentVfteRaw[i]!) > 1e-9)
      ? 'provisioned mode capped vFTE — it must never cap throughput, only price it' : null;
  }],
  ['CC-SC-05', (c) => {
    if (!flags(c).sup || (c.inp.v('runSizeMode') || 'hybrid') === 'legacy') return null;
    const m = model(c), span = supSpanFor(c, m.base.etp);
    const bad = m.yearAgentVfte.map((x,
      i) => ({ i, d: Math.abs(m.yearRunAgenticETP[i]! - ((x > 1e-4 ? span.floor : 0) + x * span.rOps)) })).filter((x) => x.d > 1e-6);
    return bad.length ? `Esup* not derived from the same vFTE the ceiling produced: ${list(bad.map((x) => `Y${x.i + 1}`))}` : null;
  }],
];
