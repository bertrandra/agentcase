import type { SectionMap } from './types';

/** Migrated sections of the "present" group: section id → lazy loader of its component. */
export const PRESENT: SectionMap = {
  commercial: () => import('./present/commercial'),
  'monthly-playback': () => import('./present/monthly-playback'),
  'story-summary': () => import('./present/story-summary'),
};
