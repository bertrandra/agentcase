import type { SectionMap } from './types';

/** Migrated sections of the "factory" group: section id → lazy loader of its component. */
export const FACTORY: SectionMap = {
  'factory-model': () => import('./factory/factory-model'),
  'release-pipeline': () => import('./factory/release-pipeline'),
  engineering: () => import('./factory/engineering'),
  'factory-timeline': () => import('./factory/factory-timeline'),
};
