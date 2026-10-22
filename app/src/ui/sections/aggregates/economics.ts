import type { SectionMap } from '../types';

/** Aggregate view of the "economics" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this group's area only. */
export const ECONOMICS_AGG: SectionMap = {
  financial: () => import('../economics/financial/Aggregate'),
};
