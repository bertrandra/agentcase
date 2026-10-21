import type { SectionMap } from './types';

/** Migrated sections of the "baseline" group: section id → lazy loader of its component. */
export const BASELINE: SectionMap = {
  'team-in': () => import('./baseline/team-in'),
  ratecard: () => import('./baseline/ratecard'),
  'loc-strat': () => import('./baseline/loc-strat'),
};
