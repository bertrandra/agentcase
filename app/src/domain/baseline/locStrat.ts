import { LOCATIONS } from '../catalog';
import type { Ctx } from '../ctx';
import { locationMix, targetBlendedTJM, teamInCost } from '../location';
import type { CaseState } from '../types/state';

export const locClass = (loc: string): string => LOCATIONS.find((l) => l.name === loc)?.cls ?? 'Local';

/** The target mix as the legacy ensureTargetLoc() reads it: the stored one, or the AS-IS mix rounded to 0.1. */
export function targetMix(s: CaseState): Record<string, number> {
  if (s.targetLocPct) return s.targetLocPct;
  const mx = locationMix(s), out: Record<string, number> = {};
  LOCATIONS.forEach((l) => { out[l.name] = Math.round((mx.pct[l.name] ?? 0) * 10) / 10; });
  return out;
}

/** AS-IS share (%) of each location class. */
export function classPct(s: CaseState): Record<string, number> {
  const mx = locationMix(s), out: Record<string, number> = {};
  Object.keys(mx.byClass).forEach((k) => { out[k] = mx.tot ? ((mx.byClass[k] ?? 0) / mx.tot) * 100 : 0; });
  return out;
}

/** Target share (%) of a location class, normalised to the target sum. */
export function classTargetPct(s: CaseState, cls: string): number {
  const t = targetMix(s);
  let part = 0, tot = 0;
  LOCATIONS.forEach((l) => { const p = t[l.name] || 0; tot += p; if (l.cls === cls) part += p; });
  return tot ? (part / tot) * 100 : 0;
}

export interface LocSummary { asisTJM: number; tgtTJM: number; gap: string; local: [number, number]; offshore: [number, number] }

/** The five figures of the Location-strategy summary band. */
export function locSummary(c: Ctx): LocSummary {
  const s = c.s, mx = locationMix(s), cls = classPct(s);
  const asisTJM = mx.tot ? teamInCost(s, c.inp).cost / (mx.tot * c.inp.p('workdays')) : 0;
  const tgtTJM = targetBlendedTJM(s);
  const gap = asisTJM > 0 ? `${tgtTJM < asisTJM ? '-' : '+'}${Math.round(Math.abs(1 - tgtTJM / asisTJM) * 100)}%` : '—';
  return {
    asisTJM, tgtTJM, gap,
    local: [Math.round(cls.Local ?? 0), Math.round(classTargetPct(s, 'Local'))],
    offshore: [Math.round(cls.Offshore ?? 0), Math.round(classTargetPct(s, 'Offshore'))],
  };
}
