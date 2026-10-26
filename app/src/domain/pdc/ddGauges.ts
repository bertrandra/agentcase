/** @calc-zone workspace-config */
import type { Ctx } from '../ctx';
import { isDone, type DdRow } from './dd';

/** Advisory floor of the € weighted coverage (%): below it the screen raises a banner (spec Q11, never a gate). */
export const DD_ADVISORY_FLOOR_PCT = 60;
/** Bands of the glass-ceiling coverage (0..1): 85 % and more is covered, 40 % and more is partial, below is uncovered. */
export const CEIL_COVER_OK = 0.85, CEIL_COVER_PARTIAL = 0.4;
/** A measured € weight below one euro reads as "€0 in this configuration". */
export const ZERO_EUR = 1;

export interface DdGauges {
  /** confirmed or waived items, their share (%, rounded), and the coefficients editable nowhere (PC5, `cf-` rows with no editor) */
  confirmed: number; pct: number; invisible: number;
  /** the share of the measured € weight that is confirmed (%, rounded), null without a fresh measurement */
  wPct: number | null;
  /** the items measured below `ZERO_EUR`, null without a fresh measurement */
  zeroEur: number | null;
}

/** Coefficients hardcoded in the calculation path and editable nowhere (PC5). */
export const isInvisible = (r: DdRow): boolean => r.id.startsWith('cf-') && r.edit === 'NONE';

/**
 * The confirmation gauges of a due-diligence register: item count, € weighted coverage (from the measured weights when fresh) and the invisible
 * coefficients. The one rule the screen, the Portfolio view and the pack read.
 */
export function ddGauges(c: Ctx, rows: DdRow[], weight: ((id: string) => number | null) | null): DdGauges {
  const done = rows.filter((r) => isDone(c, r)).length;
  let wTot = 0, wDone = 0;
  if (weight) for (const r of rows) { const x = weight(r.id); if (x == null) continue; wTot += x; if (isDone(c, r)) wDone += x; }
  return {
    confirmed: done, pct: rows.length ? Math.round((done / rows.length) * 100) : 0, invisible: rows.filter(isInvisible).length,
    wPct: weight && wTot > 0 ? Math.round((wDone / wTot) * 100) : null,
    zeroEur: weight ? rows.filter((r) => { const x = weight(r.id); return x != null && x < ZERO_EUR; }).length : null,
  };
}

export type CoverTone = 'ok' | 'partial' | 'uncovered';
/** Band of the glass-ceiling coverage. */
export const ceilCoverBand = (v: number): CoverTone => (v >= CEIL_COVER_OK ? 'ok' : v >= CEIL_COVER_PARTIAL ? 'partial' : 'uncovered');
/** The € weighted coverage is below the advisory floor. */
export const belowAdvisoryFloor = (wPct: number | null): boolean => wPct != null && wPct < DD_ADVISORY_FLOOR_PCT;
