/** @calc-zone verdict */
import { engineNow } from '../canonical';
import { headline } from '../economics/headline';
import { LOCATIONS } from '../catalog';
import type { Ctx } from '../ctx';
import { locationMix } from '../location';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import { withInputs } from '../stress/withInputs';
import { stratAppliedOf, strategyDefsOf, type StrategyDef } from './defs';

export const SCALED_IDS = ['setupTooling', 'setupGov', 'setupTraining', 'setupCoaching', 'infra'] as const;
const SETUP_IDS = ['setupTooling', 'setupGov', 'setupTraining', 'setupCoaching'] as const;

export interface StrategyRow {
  id: string; icon: string; label: string; desc: string;
  computed: { roi: number | null; tco: number; payback: number | null; net: number; aiCoverage: number; humanSup: number; tgtTJM: number; setup: number };
  declared: { risk: number; agility: number };
}

/** Effort-weighted human-supervision requirement of the current scope (invariant across strategies). */
export function scopedHumanSup(c: Ctx): number {
  let e = 0, s = 0;
  activeArtefacts(c.a, c.s).forEach((a) => { const w = +a.w || 0; e += w; s += w * (a.humanSup || 0); });
  return e ? s / e : 0;
}

/** The strategy-neutral setup/infra base: what a previously applied strategy started from, unless the user has edited the scaled inputs since. */
export function stratBaseValues(c: Ctx): Record<string, number> {
  const cur: Record<string, number> = {};
  SCALED_IDS.forEach((id) => { cur[id] = parseFloat(c.inp.v(id)) || 0; });
  const ap = stratAppliedOf(c.s);
  return ap && SCALED_IDS.every((id) => Math.abs((cur[id] as number) - (ap.written[id] || 0)) < 0.5) ? ap.base : cur;
}

/** Target location mix a strategy imposes (null = inherit the live location strategy). */
export function stratTargetLoc(c: Ctx, S: StrategyDef): Record<string, number> | null {
  if (S.locSplit === 'ASIS') {
    const mx = locationMix(c.s).pct, out: Record<string, number> = {};
    LOCATIONS.forEach((l) => { out[l.name] = Math.round(((mx[l.name] as number) || 0) * 10) / 10; });
    return out;
  }
  if (S.locSplit && typeof S.locSplit === 'object') {
    const out: Record<string, number> = {};
    LOCATIONS.forEach((l) => { out[l.name] = (S.locSplit as Record<string, number>)[l.name] || 0; });
    return out;
  }
  return null;
}

/** Evaluate every strategy on the same invariants: only the transformation levers differ (legacy evaluateStrategies). */
export function evaluateStrategies(c: Ctx, defs: StrategyDef[] = strategyDefsOf(c.s)): StrategyRow[] {
  const baseSup = scopedHumanSup(c), B = stratBaseValues(c);
  return defs.map((S) => {
    const L = S.levers || {}, ov: Record<string, string> = {};
    if (L.auto != null) ov.autoPotential = String(L.auto);
    if (L.y1 != null) ov.y1Ramp = String(L.y1);
    if (L.y2 != null) ov.y2Ramp = String(L.y2);
    if (L.y3 != null) ov.y3Ramp = String(L.y3);
    if (L.ceiling != null) ov.glassCeiling = String(L.ceiling);
    const sF = L.setupF ?? 1, rF = L.runF ?? 1;
    SETUP_IDS.forEach((id) => { ov[id] = String((B[id] as number) * sF); });
    ov.infra = String((B.infra as number) * rF);
    ov.runTeamFactor = String(rF);
    const tlp = stratTargetLoc(c, S), cs = withInputs(c, ov);
    const cc = tlp ? { ...cs, s: { ...cs.s, targetLocPct: tlp } } : cs, m = model(cc), h = headline(cc);
    const run = engineNow(cc).years().reduce((a, y) => a + y.totalRunCost, 0), payback = m.setupTotal === 0 ? null : h.paybackYear;   // nothing invested: nothing to pay back
    const eff = m.eff;
    return {
      id: S.id, icon: S.icon, label: S.label, desc: S.desc,
      computed: { roi: h.roi, tco: m.setupTotal + run, payback, net: h.net, aiCoverage: eff,
        humanSup: 100 - eff + (eff * baseSup) / 100, tgtTJM: m.tgtTJM, setup: m.setupTotal },
      declared: { risk: S.declared?.risk || 3, agility: S.declared?.agility || 3 },
    };
  });
}
