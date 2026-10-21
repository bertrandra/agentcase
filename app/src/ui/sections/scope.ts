import type { SectionMap } from './types';

/** Migrated sections of the "scope" group: section id → lazy loader of its component. */
export const SCOPE: SectionMap = {
  'scope-sel': () => import('./scope/scope-sel'),
  'lc-weighting': () => import('./scope/lc-weighting'),
  'phase-scope': () => import('./scope/phase-scope'),
  scurve: () => import('./scope/scurve'),
  params: () => import('./scope/params'),
};
