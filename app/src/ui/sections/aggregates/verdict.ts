import type { SectionMap } from '../types';

/** Vue agrégée of the "verdict" group: section id → lazy component shown instead of the section when the Vue is a Portefeuille or a Vague. Edited by this group's area only. */
export const VERDICT_AGG: SectionMap = {
  // already scope-aware: the section itself renders the portfolio / wave verdict (PortfolioVerdict)
  decision: () => import('../verdict/decision'),
};
