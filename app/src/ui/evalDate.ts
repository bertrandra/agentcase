import { useMemo } from 'react';
import { evalDay } from '@/domain/model/evidenceTiers';

/**
 * The evaluation date of the evidence ledger: today at local midnight (`evalDay`, the rule the exports use for their export day), read from the
 * clock here, in the UI (the domain never reads it). Stable for the life of the component, so the grade does not change while a screen is open.
 */
export function useEvalDate(): number {
  return useMemo(() => evalDay(new Date()), []);
}
