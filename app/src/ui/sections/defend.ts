import type { SectionMap } from './types';

/** Migrated sections of the "defend" group: section id → lazy loader of its component. */
export const DEFEND: SectionMap = {
  assumptions: () => import('./defend/assumptions'),
  duediligence: () => import('./defend/duediligence'),
  verif: () => import('./defend/verif'),
};
