import type { SectionMap } from '../types';

/** Aggregate view of the "scope" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this group's area only. */
export const SCOPE_AGG: SectionMap = {
  'params': () => import('../scope/params/Aggregate'),
  'scurve': () => import('../scope/scurve/Aggregate'),
  'scope-sel': () => import('../scope/scope-sel/Aggregate'),
  'phase-scope': () => import('../scope/phase-scope/Aggregate'),
  'lc-weighting': () => import('../scope/lc-weighting/Aggregate'),
};
