/** @calc-zone time-engine */
import { MATURITY_DEFAULT } from './catalog';
import type { CaseState } from './types/state';

/** The shipped L1..L4 lower bounds of the adoption axis (% of the ramp): [0, 25, 55, 80] (catalog/maturityMap.json). */
export const RAMP_BOUNDS_DEFAULT: readonly number[] = MATURITY_DEFAULT.rampBounds;

/**
 * The case's L1..Ln lower bounds of the adoption axis (MATURITY_MAP.rampBounds, editable on the Maturity map), the default when the case has none.
 * The single source of the thresholds: the Time Engine's maturity of each month, the S-curve readout and markers, the maturity level and the labels.
 */
export const rampBoundsOf = (s: Pick<CaseState, 'MATURITY_MAP'>): number[] =>
  (s.MATURITY_MAP?.rampBounds?.length ? s.MATURITY_MAP.rampBounds : RAMP_BOUNDS_DEFAULT.slice());

/** Level number (1-based) of an adoption level: the highest level whose lower bound `v` has reached. */
export function levelFromBounds(v: number, bounds: readonly number[]): number {
  let l = 1;
  for (let i = 1; i < bounds.length; i++) if (v >= (bounds[i] as number)) l = i + 1;
  return l;
}

/** "L3" for an adoption level. */
export const levelLabelFor = (v: number, bounds: readonly number[]): string => `L${levelFromBounds(v, bounds)}`;

/** The thresholds an adoption curve crosses, for a label: "25 / 55 / 80%" (the bounds above L1). */
export const crossingLabel = (bounds: readonly number[]): string => `${bounds.slice(1).map((b) => Math.round(b)).join(' / ')}%`;
