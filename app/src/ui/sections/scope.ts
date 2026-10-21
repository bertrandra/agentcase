import type { SectionMap } from './types';

/** Migrated sections of the "scope" group: section id → lazy loader of its component. */
export const SCOPE: SectionMap = {
  'scope-sel': () => import('./scope/scope-sel'),
};
