import type { SectionMap } from './types';

/** Migrated sections of the "refshare" group: section id → lazy loader of its component. */
export const REFSHARE: SectionMap = {
  sources: () => import('./refshare/sources'),
  'arch-layers': () => import('./refshare/arch-layers'),
  'arch-content': () => import('./refshare/arch-content'),
};
