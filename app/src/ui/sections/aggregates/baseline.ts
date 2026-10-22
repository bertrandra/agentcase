import type { SectionMap } from '../types';

/** Aggregate view of the "baseline" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this group's area only. */
export const BASELINE_AGG: SectionMap = {
  'team-in': () => import('../baseline/team-in/Aggregate'),
};
