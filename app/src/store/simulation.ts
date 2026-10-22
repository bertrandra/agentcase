/** @calc-zone stress */
import { useMemo, useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import { mcFingerprint, type McResult } from '@/domain/stress';
import { useDoc } from './hooks';
import type { Doc } from './types';

/** The last Monte Carlo run and the fingerprint of the case it was made on. */
export interface SimRun extends McResult { fingerprint: number }

/** Derived data, kept out of the undoable document: the distribution is recomputed (not restored) when the case changes. */
export const simStore = createStore<{ run: SimRun | null }>(() => ({ run: null }));

const fp = new WeakMap<Doc, number>();
export function fingerprintOf(doc: Doc): number {
  let h = fp.get(doc);
  if (h === undefined) { h = mcFingerprint(doc); fp.set(doc, h); }
  return h;
}

export interface Simulation { run: SimRun | null; stale: boolean; auto: boolean }
/** The last run, whether the scenario moved since (a verdict never silently outlives its scenario) and the auto re-run switch. */
export function useSimulation(): Simulation {
  const run = useSyncExternalStore(simStore.subscribe, () => simStore.getState().run);
  const doc = useDoc((d) => d), auto = useDoc((d) => (d as { mcAuto?: boolean }).mcAuto !== false);
  return useMemo(() => ({ run, stale: !!run && run.fingerprint !== fingerprintOf(doc), auto }), [run, doc, auto]);
}
