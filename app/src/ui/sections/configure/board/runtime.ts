import { useMemo, useSyncExternalStore } from 'react';
import { mcsRunStore } from '@/controllers/modelRun';
import { ddBase } from '@/domain/pdc/dd';
import type { VarRuntime } from '@/domain/pdc/variables';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { useSimulation } from '@/store/simulation';
import { useEvalDate } from '@/ui/evalDate';

const BASE = ddBase(defaultDoc);

/**
 * What the registry variables read besides the case: the last Monte Carlo run (store/simulation) ONLY while it was made on this case — a stale
 * run is never shown as current: the Monte Carlo cards show a dash and the decision cards recompute their fallback run on the case —, the tornado
 * of the last stochastic run and the due-diligence benchmark. Re-evaluates when a run is made or the case moves.
 */
export function useVarRuntime(): VarRuntime {
  const { run, stale } = useSimulation(), last = useSyncExternalStore(mcsRunStore.subscribe, () => mcsRunStore.getState().last), now = useEvalDate();
  return useMemo(() => ({ mc: stale ? null : run, tornado: last?.tornado ?? null, ddBase: BASE, now }), [run, stale, last, now]);
}
