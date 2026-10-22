/** @calc-zone aggregate-views */
import { LOCATIONS } from '../catalog';
import { classPct, classTargetPct, locSummary, targetMix } from '../baseline/locStrat';
import { locationMix } from '../location';
import { base, productCases, spread, type AggBase, type Spread } from './aggScopeRows';
import type { Portfolio } from './types';

/** Section "Location strategy": the AS-IS and target location mix of each product, with the blended day rates they imply. */
export interface LocStratRow extends AggBase {
  fte: number; asisTJM: number; targetTJM: number; gap: string; localAsis: number; localTarget: number; offshoreAsis: number; offshoreTarget: number; own: boolean;
  asis: Record<string, number>; target: Record<string, number>;
}
/** One location of the selection: entry FTE there, its share of the selection, and the target share weighted by each product's entry FTE. */
export interface LocMixLine { name: string; cls: string; fte: number; asisPct: number; targetPct: number }
export interface LocStratAgg { rows: LocStratRow[]; mix: LocMixLine[]; fte: number; localTarget: Spread | null; offshoreTarget: Spread | null }

export function baselineLocStrat(pf: Portfolio, ids: string[]): LocStratAgg {
  const cs = productCases(pf, ids), byLoc: Record<string, number> = {}, tgt: Record<string, number> = {};
  let fte = 0;
  const rows = cs.map((p) => {
    const mx = locationMix(p.c), t = targetMix(p.c), tsum = LOCATIONS.reduce((s, l) => s + (t[l.name] || 0), 0), sum = locSummary(p.ctx), cls = classPct(p.c);
    for (const l of LOCATIONS) {
      byLoc[l.name] = (byLoc[l.name] ?? 0) + (mx.byLoc[l.name] ?? 0);
      tgt[l.name] = (tgt[l.name] ?? 0) + (tsum ? ((t[l.name] || 0) / tsum) * mx.tot : 0);
    }
    fte += mx.tot;
    return { ...base(p), fte: mx.tot, asisTJM: sum.asisTJM, targetTJM: sum.tgtTJM, gap: sum.gap, localAsis: cls.Local ?? 0, localTarget: classTargetPct(p.c, 'Local'),
      offshoreAsis: cls.Offshore ?? 0, offshoreTarget: classTargetPct(p.c, 'Offshore'), own: p.overridden('targetLocPct'), asis: mx.pct, target: t };
  });
  const mix = LOCATIONS.map((l) => ({ name: l.name, cls: l.cls, fte: byLoc[l.name] ?? 0, asisPct: fte ? ((byLoc[l.name] ?? 0) / fte) * 100 : 0, targetPct: fte ? ((tgt[l.name] ?? 0) / fte) * 100 : 0 }));
  return { rows, mix, fte, localTarget: spread(rows.map((r) => r.localTarget)), offshoreTarget: spread(rows.map((r) => r.offshoreTarget)) };
}
