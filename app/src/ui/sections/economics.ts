import type { SectionMap } from './types';

/** Migrated sections of the "economics" group: section id → lazy loader of its component. */
export const ECONOMICS: SectionMap = {
  financial: () => import('./economics/financial'),
  run: () => import('./economics/run'),
  annual: () => import('./economics/annual'),
  monthly: () => import('./economics/monthly'),
};
