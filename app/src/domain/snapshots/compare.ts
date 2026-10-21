import { makeCtx } from '../ctx';
import { VARIABLES } from '../pdc/variables';
import type { CaseState } from '../types/state';

export interface CompareRow { id: string; label: string; unit: string; a: number | null; b: number | null; delta: number | null }

/** The headline figures compared by the snapshot manager (legacy snapCompareMetrics). */
const IDS = ['netSavY3', 'runCostY3', 'npv8', 'paybackMonths'];

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

/** Side-by-side headline figures of two cases; delta = b - a. Pure: each case is computed on its own, nothing is applied. */
export function compareCases(a: CaseState, b: CaseState): CompareRow[] {
  const ca = makeCtx(a), cb = makeCtx(b);
  return IDS.map((id) => {
    const def = VARIABLES.find((v) => v.id === id);
    if (!def) throw new Error(`unknown variable ${id}`);
    const x = num(def.get(ca)), y = num(def.get(cb));
    return { id, label: def.label, unit: def.unit, a: x, b: y, delta: x !== null && y !== null ? y - x : null };
  });
}
