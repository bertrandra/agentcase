import type { SectionMap } from './types';

/** Migrated sections of the "tune" group: section id → lazy component loader. */
export const TUNE: SectionMap = {
  // first half (tuneA)
  'maturity-map': () => import('./tune/maturity-map'),
  maturity: () => import('./tune/maturity'),
  readiness: () => import('./tune/readiness'),
  eligibility: () => import('./tune/eligibility'),
  program: () => import('./tune/program'),
  opmodel: () => import('./tune/opmodel'),
  // second half (tuneB)
  'run-sizing': () => import('./tune/run-sizing'),
  'token-econ': () => import('./tune/token-econ'),
  setup: () => import('./tune/setup'),
  risk: () => import('./tune/risk'),
  knowledge: () => import('./tune/knowledge'),
  'lifecycle-edit': () => import('./tune/lifecycle-edit'),
};
