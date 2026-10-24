/** @calc-zone verification */
import type { Ctx } from '../ctx';
import { engagementKey } from '../engagement';
import { sddMaturity } from '../model/vtax';
import { GOV_GATES } from '../tune/maturityTab';
import { IP_SYNTH } from '../tune/program';
import { wave, type ConvCheck } from './verifConvTypes';

const orDefault = (c: Ctx, id: string, d: number): number => { const v = c.inp.p(id); return isNaN(v) ? d : v; };

/**
 * Wave 3 (SDD maturity, coaching curve, measurement socle, governance gates) and Wave 4 (pilot sizing, Volet A ramp, IP synthesis,
 * token cache) invariants of the legacy `wave3Checks()` / `wave4Checks()`. CC-SOCLE-01 and CC-CACHE-01 cannot fail (the legacy
 * passes `true`: static read-outs); CC-GATE-01 and CC-IP-01 depend on constants only, CC-SDD-01 holds by the clamp in sddMaturity().
 */
export function wave3Checks(c: Ctx): ConvCheck[] {
  const sdd = sddMaturity(c), y1 = orDefault(c, 'coachY1', 40), cruise = orDefault(c, 'coachCruise', 20);
  return [
    wave('CC-SDD-01', sdd >= 0 && sdd <= 100, `${sdd}/100 · tax cut ${Math.round(0.5 * sdd)}%`),
    wave('CC-COACH-01', cruise <= y1, `${y1}% → ${cruise}%`),
    wave('CC-SOCLE-01', true, 'DORA + SPACE + AI signals + human indicators'),
    wave('CC-GATE-01', GOV_GATES.length >= 6, `${GOV_GATES.length} gates incl. enlarged DoD + AI-BOM`),
  ];
}

export function wave4Checks(c: Ctx): ConvCheck[] {
  const weeks = c.inp.p('pilotWeeks') || 12, ops = c.inp.p('capOps') || 0, target = c.inp.p('capTarget') || 0, key = engagementKey(c);
  return [
    wave('CC-PILOT-01', weeks > 0, `${weeks} prove weeks`),
    wave('CC-CAP-01', target >= ops, `${ops} → ${target}`),
    wave('CC-IP-01', !!IP_SYNTH[key], key),
    wave('CC-CACHE-01', true, 'analytical'),
  ];
}
