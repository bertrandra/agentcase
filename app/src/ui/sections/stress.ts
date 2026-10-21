import type { SectionMap } from './types';

/** Migrated sections of the "stress" group: section id → lazy loader of its component. */
export const STRESS: SectionMap = {
  scenarios: () => import('./stress/scenarios'),
  compare: () => import('./stress/compare'),
  sensitivity: () => import('./stress/sensitivity'),
  montecarlo: () => import('./stress/montecarlo'),
};
