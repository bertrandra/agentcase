import type { SectionMap } from './types';

/** Migrated sections of the "configure" group: section id → lazy loader of its component. */
export const CONFIGURE: SectionMap = {
  board: () => import('./configure/board'),
};
