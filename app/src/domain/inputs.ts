/** @calc-zone foundation */
import { caseValues } from './process/storedValues';
import type { CaseState } from './types/state';

/**
 * Typed replacement of the legacy P()/V()/C() seam: reads the captured DOM inputs of a case. Same semantics. Schema v4 (BPMN B9c): the values are
 * `caseValues`, the form values over the programme's values stored in the case's document, so every reader of a programme value reads the document.
 */
export interface Inputs {
  /** string value ('' when absent) */
  v(id: string): string;
  /** parseFloat of the raw value (NaN when absent), exactly like legacy P() */
  p(id: string): number;
  /** checkbox state (false when absent) */
  c(id: string): boolean;
}

export function makeInputs(s: CaseState): Inputs {
  const values = caseValues(s);
  const checked = s.dom?.checked ?? {};
  return {
    // legacy readInputs(): an empty horizon defaults to '3'
    v: (id) => (id === 'horizon' && !values[id] ? '3' : id in values ? String(values[id]) : ''),
    p: (id) => (id === 'horizon' && !values[id] ? 3 : id in values ? parseFloat(values[id] as string) : NaN),
    c: (id) => (id in checked ? !!checked[id] : false),
  };
}

/** A technical-cap number bounded to 10..100 (a non-number reads 100). */
export const clampAutoCap = (n: number): number => (isNaN(n) ? 100 : Math.max(10, Math.min(100, n)));
/** Technical cap on the automation potential from the raw autoCapPct input text (10..100, 100 when blank or invalid). */
export const autoCapFrom = (raw: string | undefined): number => clampAutoCap(parseFloat(raw ?? ''));
/** The potential "Fit to selected scope" gives (legacy applyScopeAuto): the scope's automatable average, rounded, within 0..the technical cap. */
export const fitPotential = (avgAgent: number, cap: number): number => Math.max(0, Math.min(cap, Math.round(avgAgent)));

/** Horizon bounds in whole years (the Horizon field and the Excel Parameters sheet offer 1 to 10). */
export const HORIZON_MIN = 1, HORIZON_MAX = 10, HORIZON_DEFAULT = 3;
/**
 * The one horizon reader: a raw horizon value (form text, JSON, Excel cell) as whole years in 1..10. Empty or not a number reads 3 (legacy
 * readInputs), the integer part is kept like the legacy parseInt, and "0" / "-1" / "25" from a file are clamped instead of throwing or diverging.
 */
export function clampHorizonYears(raw: unknown): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? Math.max(HORIZON_MIN, Math.min(HORIZON_MAX, n)) : HORIZON_DEFAULT;
}
/** The case horizon in years from its inputs (`clampHorizonYears` of the Horizon field). */
export const caseHorizonYears = (inp: Pick<Inputs, 'v'>): number => clampHorizonYears(inp.v('horizon'));
