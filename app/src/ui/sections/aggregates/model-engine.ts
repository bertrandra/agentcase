import type { SectionMap } from '../types';

/**
 * Aggregate view of the "model-engine" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited
 * by this group's area only.
 */
export const MODEL_ENGINE_AGG: SectionMap = {
  'model-stochastic': () => import('../model-engine/stochastic/Aggregate'),
  'model-convergence': () => import('../model-engine/convergence/Aggregate'),
  'model-supervision': () => import('../model-engine/supervision/Aggregate'),
  'model-flow': () => import('../model-engine/flow/Aggregate'),
  'model-evidence': () => import('../model-engine/evidence/Aggregate'),
  'model-verification': () => import('../model-engine/verification/Aggregate'),
};
