import type { SectionMap } from '../types';

/** Vue agrégée of the "economics" group: section id → lazy component shown instead of the section when the Vue is a Portefeuille or a Vague. Edited by this group's area only. */
export const ECONOMICS_AGG: SectionMap = {
  financial: () => import('../economics/financial/Aggregate'),
};
