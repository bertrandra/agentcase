import { useMemo, useSyncExternalStore } from 'react';
import { mcsRunStore } from '@/controllers/modelRun';
import { ddBase } from '@/domain/pdc/dd';
import type { VarRuntime } from '@/domain/pdc/variables';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { useSimulation } from '@/store/simulation';

const BASE = ddBase(defaultDoc);

/**
 * What the registry variables read besides the case: the last Monte Carlo run (store/simulation, dash until one exists), the tornado of the
 * last stochastic run and the due-diligence benchmark. Re-evaluates when a run is made.
 */
export function useVarRuntime(): VarRuntime {
  const { run } = useSimulation(), last = useSyncExternalStore(mcsRunStore.subscribe, () => mcsRunStore.getState().last);
  return useMemo(() => ({ mc: run, tornado: last?.tornado ?? null, ddBase: BASE }), [run, last]);
}
