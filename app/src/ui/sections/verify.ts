import type { SectionMap } from './types';

/** Migrated sections of the "verify" group: section id → lazy loader of its component. */
export const VERIFY: SectionMap = {
  // verify, second half (breakdown views)
  'asis-tobe': () => import('./verify/asis-tobe'),
  exec: () => import('./verify/exec'),
  kpi: () => import('./verify/kpi'),
  productivity: () => import('./verify/productivity'),
  velocity: () => import('./verify/velocity'),
  quality: () => import('./verify/quality'),
  compliance: () => import('./verify/compliance'),
  gantt: () => import('./verify/gantt'),
};
