import { useMemo } from 'react';

/**
 * The evaluation date of the evidence ledger: today at local midnight, read from the clock here, in the UI (the domain never reads it). Stable for the
 * life of the component, so the grade does not change while a screen is open.
 */
export function useEvalDate(): number {
  return useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }, []);
}
