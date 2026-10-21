import type { CaseState } from './types/state';

/** Typed replacement of the legacy P()/V()/C() seam: reads the captured DOM inputs of a case. Same semantics. */
export interface Inputs {
  /** string value ('' when absent) */
  v(id: string): string;
  /** parseFloat of the raw value (NaN when absent), exactly like legacy P() */
  p(id: string): number;
  /** checkbox state (false when absent) */
  c(id: string): boolean;
}

export function makeInputs(s: CaseState): Inputs {
  const values = s.dom?.values ?? {};
  const checked = s.dom?.checked ?? {};
  return {
    // legacy readInputs(): an empty horizon defaults to '3'
    v: (id) => (id === 'horizon' && !values[id] ? '3' : id in values ? String(values[id]) : ''),
    p: (id) => (id === 'horizon' && !values[id] ? 3 : id in values ? parseFloat(values[id] as string) : NaN),
    c: (id) => (id in checked ? !!checked[id] : false),
  };
}
