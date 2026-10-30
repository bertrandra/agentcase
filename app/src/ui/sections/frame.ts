import type { SectionMap } from './types';

/** Migrated sections of the "frame" group: section id → lazy loader of its component. */
export const FRAME: SectionMap = {
  'home': () => import('./frame/home'),
  'engagement-context': () => import('./frame/engagement-context'),
  'engage': () => import('./frame/engage'),
  'transform-params': () => import('./frame/transform-params'),
  'organisation': () => import('./frame/organisation'),
};
