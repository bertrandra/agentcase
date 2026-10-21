import type { SectionMap } from './types';

/** Migrated sections of the "verdict" group: section id → lazy loader of its component. */
export const VERDICT: SectionMap = {
  results: () => import('./verdict/results'),
  decision: () => import('./verdict/decision'),
  strategies: () => import('./verdict/strategies'),
};
