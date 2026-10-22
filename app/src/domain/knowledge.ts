/** @calc-zone knowledge-hub @owner kt-avoided-saving */
import { CC_MULT, KT_RED } from './catalog';
import type { Ctx } from './ctx';
import { engagementCoef } from './engagement';

export const khEnabled = (c: Ctx): boolean => c.inp.c('khEnabled') && engagementCoef(c).khMaxCC > 0;

export function khAsisScore(c: Ctx): number {
  let s = 0;
  for (let i = 0; i < 9; i++) { let v = c.inp.p('khA' + i); if (isNaN(v)) v = 2; s += v; }
  return (s / 36) * 100;
}

export function khAsisCC(c: Ctx): number {
  const x = khAsisScore(c);
  return x >= 85 ? 4 : x >= 65 ? 3 : x >= 45 ? 2 : x >= 25 ? 1 : 0;
}

export function khTargetCC(c: Ctx): number {
  let t = parseInt(c.inp.v('khTargetCC'), 10);
  if (isNaN(t)) t = 3;
  return Math.max(0, Math.min(engagementCoef(c).khMaxCC, t));
}

/** Potential multiplier of the knowledge hub (1 when off). */
export const khMult = (c: Ctx): number => (khEnabled(c) ? (CC_MULT[khTargetCC(c)] as number) : 1);

/** Context-completeness level per year, AS-IS → target. */
export function khCcByYear(c: Ctx): number[] {
  if (!khEnabled(c)) return [0, 0, 0];
  const a = khAsisCC(c), t = khTargetCC(c);
  return [Math.round(a + (t - a) / 3), Math.round(a + ((t - a) * 2) / 3), t];
}

export function khSetupCost(c: Ctx): number {
  if (!khEnabled(c)) return 0;
  let base = c.inp.p('khSetupBase');
  if (isNaN(base)) base = 120000;
  const gap = Math.max(0, khTargetCC(c) - khAsisCC(c));
  return base * (0.5 + 0.25 * gap);
}

export function khRunAnnual(c: Ctx, tgtTJM: number, wd: number): number {
  if (!khEnabled(c)) return 0;
  let cf = c.inp.p('khCurationFTE'); if (isNaN(cf)) cf = 0.5;
  let im = c.inp.p('khInfraMonthly'); if (isNaN(im)) im = 2500;
  return cf * tgtTJM * wd + im * 12;
}

/** Knowledge-transfer days avoided per year thanks to the hub. */
export function ktAvoidedAnnual(c: Ctx, baseEtp: number, tgtTJM: number, cc: number): number {
  if (!khEnabled(c)) return 0;
  return baseEtp * 0.2 * 15 * tgtTJM * (KT_RED[Math.max(0, Math.min(4, cc))] || 0);
}
