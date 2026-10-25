import type { SectionMap } from '../types';

/**
 * Aggregate view of the "stress" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by
 * this group's area only.
 */
export const STRESS_AGG: SectionMap = {
  'montecarlo': () => import('../stress/montecarlo/Aggregate'),
  'scenarios': () => import('../stress/scenarios/Aggregate'),
  'compare': () => import('../stress/compare/Aggregate'),
  'sensitivity': () => import('../stress/sensitivity/Aggregate'),
};
