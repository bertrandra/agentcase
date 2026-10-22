import type { SectionMap } from '../types';

/** Aggregate view of the "verify" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by this group's area only. */
export const VERIFY_AGG: SectionMap = {
  // already scope-aware: the wave Gantt (verify/gantt/Waves.tsx)
  gantt: () => import('../verify/gantt'),
};
