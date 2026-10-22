import type { SectionMap } from '../types';

/** Aggregate view of the "verdict" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this group's area only. */
export const VERDICT_AGG: SectionMap = {
  results: () => import('../verdict/results/Aggregate'),
  // already scope-aware: the section itself renders the portfolio / wave verdict (PortfolioVerdict)
  decision: () => import('../verdict/decision'),
  strategies: () => import('../verdict/strategies/Aggregate'),
};
