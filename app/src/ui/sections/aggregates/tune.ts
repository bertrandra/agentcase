import type { SectionMap } from '../types';

/**
 * Aggregate view of the "tune" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this
 * group's area only.
 */
export const TUNE_AGG: SectionMap = {
  'maturity-map': () => import('../tune/maturity-map/Aggregate'),
  readiness: () => import('../tune/readiness/Aggregate'),
  'lifecycle-edit': () => import('../tune/lifecycle-edit/Aggregate'),
  'token-econ': () => import('../tune/token-econ/Aggregate'),
  knowledge: () => import('../tune/knowledge/Aggregate'),
  'run-sizing': () => import('../tune/run-sizing/Aggregate'),
  opmodel: () => import('../tune/opmodel/Aggregate'),
  setup: () => import('../tune/setup/Aggregate'),
  eligibility: () => import('../tune/eligibility/Aggregate'),
  maturity: () => import('../tune/maturity/Aggregate'),
  program: () => import('../tune/program/Aggregate'),
  risk: () => import('../tune/risk/Aggregate'),
};
