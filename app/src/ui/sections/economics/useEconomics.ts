import { useMemo } from 'react';
import { economicsView, type EconomicsView } from '@/domain/economics';
import { useCtx } from '@/store/hooks';

/** The money views of the current case (Time Engine + model), recomputed only when the document changes. */
export function useEconomics(): EconomicsView {
  const ctx = useCtx();
  return useMemo(() => economicsView(ctx), [ctx]);
}
