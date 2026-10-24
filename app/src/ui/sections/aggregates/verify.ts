import type { SectionMap } from '../types';

/**
 * Aggregate view of the "verify" group: section id → lazy component shown instead of the section when the View is a Portfolio or a Wave. Edited by
 * this group's area only.
 */
export const VERIFY_AGG: SectionMap = {
  // already scope-aware: the wave Gantt (verify/gantt/Waves.tsx)
  gantt: () => import('../verify/gantt'),
  'fte-vfte': () => import('../verify/fte-vfte/Aggregate'),
  'vfte-ov': () => import('../verify/vfte-ov/Aggregate'),
  'team-out': () => import('../verify/team-out/Aggregate'),
  'tobe-team': () => import('../verify/tobe-team/Aggregate'),
  'phase-art': () => import('../verify/phase-art/Aggregate'),
  'agent-dir': () => import('../verify/agent-dir/Aggregate'),
  'agent-detail': () => import('../verify/agent-detail/Aggregate'),
  'agent-usage': () => import('../verify/agent-usage/Aggregate'),
  exec: () => import('../verify/exec/Aggregate'),
  productivity: () => import('../verify/productivity/Aggregate'),
  velocity: () => import('../verify/velocity/Aggregate'),
  quality: () => import('../verify/quality/Aggregate'),
  compliance: () => import('../verify/compliance/Aggregate'),
  kpi: () => import('../verify/kpi/Aggregate'),
  'asis-tobe': () => import('../verify/asis-tobe/Aggregate'),
};
