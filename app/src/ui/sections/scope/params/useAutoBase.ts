import { useMemo } from 'react';
import { autoBase, type AutoBase } from '@/domain/scope/automation';
import { useCtx } from '@/store/hooks';

/** Model + Time Engine of the current document, built once per document (shared by the chart and the funnel). */
export function useAutoBase(): AutoBase {
  const c = useCtx();
  return useMemo(() => autoBase(c), [c]);
}
