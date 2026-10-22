import type { SectionMap } from '../types';

/** Vue agrégée of the "verify" group: section id → lazy component shown instead of the section when the Vue is a Portefeuille or a Vague. Edited by this group's area only. */
export const VERIFY_AGG: SectionMap = {
  // already scope-aware: the wave Gantt (verify/gantt/Waves.tsx)
  gantt: () => import('../verify/gantt'),
};
