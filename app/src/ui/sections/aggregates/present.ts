import type { SectionMap } from '../types';

/** Aggregate view of the "present" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this group's area only. */
export const PRESENT_AGG: SectionMap = {
  'monthly-playback': () => import('../present/monthly-playback/Aggregate'),
  commercial: () => import('../present/commercial/Aggregate'),
  'story-summary': () => import('../present/story-summary/Aggregate'),
};
