import { useSyncExternalStore } from 'react';
import { mcsRunStore } from '@/controllers/modelRun';

/** The last stochastic run (session view state, not part of the case) and whether one is under way. */
export const useMcsRun = () => useSyncExternalStore(mcsRunStore.subscribe, mcsRunStore.getState);
