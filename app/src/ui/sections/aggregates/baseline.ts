import type { SectionMap } from '../types';

/** Vue agrégée of the "baseline" group: section id → lazy component shown instead of the section when the Vue is a Portefeuille or a Vague. Edited by this group's area only. */
export const BASELINE_AGG: SectionMap = {
  'team-in': () => import('../baseline/team-in/Aggregate'),
};
