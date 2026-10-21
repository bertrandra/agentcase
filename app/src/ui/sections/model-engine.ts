import type { SectionMap } from './types';

/** Migrated sections of the "model-engine" group: section id → lazy loader of its component. */
export const MODEL_ENGINE: SectionMap = {
  'model-convergence': () => import('./model-engine/convergence'),
  'model-verification': () => import('./model-engine/verification'),
  'model-supervision': () => import('./model-engine/supervision'),
  'model-stochastic': () => import('./model-engine/stochastic'),
  'model-flow': () => import('./model-engine/flow'),
  'model-evidence': () => import('./model-engine/evidence'),
};
