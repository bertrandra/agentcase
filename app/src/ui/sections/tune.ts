import type { SectionMap } from './types';

/** Migrated sections of the "tune" group: section id → lazy loader of its component. */
export const TUNE: SectionMap = {
  // first half (tuneA)
  'maturity-map': () => import('./tune/maturity-map'),
  'maturity': () => import('./tune/maturity'),
  'readiness': () => import('./tune/readiness'),
  'eligibility': () => import('./tune/eligibility'),
  'program': () => import('./tune/program'),
  'opmodel': () => import('./tune/opmodel'),
};
