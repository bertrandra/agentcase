/** @calc-zone portfolio-consolidation */
import { useMemo } from 'react';
import { waveSchedule, type Issue } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { usePortfolio } from './hooks';

/** Transformation-team capacity: the most products in setup at the same time; 0 = no limit (the field is absent). */
export const useSetupCapacity = (): number => usePortfolio((p) => p.maxConcurrentSetups ?? 0);

/** The schedule diagnostics (dependency ignored or delaying a wave, setups pushed back by the capacity), from the one schedule of the consolidation. */
export function useScheduleNotes(): Issue[] {
  const core = useCorePortfolio();
  return useMemo(() => waveSchedule(core).notes, [core]);
}
