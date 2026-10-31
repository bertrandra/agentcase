/** @calc-zone aggregate-views */
import { activityEnabled } from '../programme/activityMeta';
import { PROGRAMME_ACTIVITIES } from '../programme/catalogue';
import { lineProfile } from '../programme/costProfile';
import { OPT_INS, optInOn } from '../programme/optIn';
import { engineProfile, horizonMonthsOf, pilotLine, programmeLines } from '../programme/profile';
import { byYear } from '../programme/table';
import { base, productCases, type AggBase } from './aggScopeRows';
import type { Portfolio } from './types';

/**
 * Section "📋 Programme" (phase B9e, docs/SPEC_BPMN.md § 19.11), aggregate view: per product, the activities that count, the opt-in activities
 * switched on, the cost lines with a type other than Spread, and the programme cost of its euro result by horizon year and in total (the
 * engine's own profile, `programme/profile.ts`), with the pilot outside it. The totals add the products' figures up.
 */
export interface ProgrammeAggRow extends AggBase { enabled: number; activities: number; optIns: string[]; typed: number; years: number[]; total: number;
  pilot: number }
export interface ProgrammeAgg { rows: ProgrammeAggRow[]; years: number[]; total: number; pilot: number }

export function scopeProgramme(pf: Portfolio, ids: string[]): ProgrammeAgg {
  const rows = productCases(pf, ids).map((p): ProgrammeAggRow => {
    const H = horizonMonthsOf(p.ctx), years = byYear(engineProfile(p.ctx, H).setup, H);
    return { ...base(p), activities: PROGRAMME_ACTIVITIES.length, enabled: PROGRAMME_ACTIVITIES.filter((d) => activityEnabled(p.ctx, d).on).length,
      optIns: OPT_INS.filter((d) => optInOn(p.ctx, d)).map((d) => d.label),
      typed: programmeLines(p.ctx, H).filter((l) => lineProfile(p.ctx, l.id) !== 'spread').length,
      years, total: years.reduce((a, x) => a + x, 0), pilot: pilotLine(p.ctx).cost };
  });
  const n = Math.max(0, ...rows.map((r) => r.years.length));
  const years = Array.from({ length: n }, (_, y) => rows.reduce((a, r) => a + (r.years[y] ?? 0), 0));
  return { rows, years, total: rows.reduce((a, r) => a + r.total, 0), pilot: rows.reduce((a, r) => a + r.pilot, 0) };
}
