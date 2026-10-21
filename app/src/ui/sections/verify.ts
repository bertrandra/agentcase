import type { SectionMap } from './types';

/** Migrated sections of the "verify" group: section id → lazy loader of its component. */
export const VERIFY: SectionMap = {
  'fte-vfte': () => import('./verifyA/fte-vfte'),
  'team-out': () => import('./verifyA/team-out'),
  'vfte-ov': () => import('./verifyA/vfte-ov'),
  'tobe-team': () => import('./verifyA/tobe-team'),
  'phase-art': () => import('./verifyA/phase-art'),
};
