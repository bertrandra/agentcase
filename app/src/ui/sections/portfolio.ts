import type { SectionMap } from './types';

/** Sections of the "portfolio" group (multi-product): section id → lazy loader of its component. */
export const PORTFOLIO: SectionMap = {
  products: () => import('./portfolio/products'),
  overrides: () => import('./portfolio/overrides'),
  'knowledge-transfer': () => import('./portfolio/knowledge-transfer'),
};
