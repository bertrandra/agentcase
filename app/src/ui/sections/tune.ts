import type { SectionMap } from './types';

/** Migrated sections of the "tune" group: section id → lazy component loader. */
export const TUNE: SectionMap = {
  'run-sizing': () => import('./tune/run-sizing'),
  'token-econ': () => import('./tune/token-econ'),
  setup: () => import('./tune/setup'),
  risk: () => import('./tune/risk'),
  knowledge: () => import('./tune/knowledge'),
  'lifecycle-edit': () => import('./tune/lifecycle-edit'),
};
