import { addDepEdge, applyPrunedDeps, flipDepEdge, removeDepEdge, setDepDescription } from '@/controllers/refshare';
import type { Sample } from './types';

/** One sample call per command type of the refshare controllers (section dependency editor). */
export const samples: Record<string, Sample> = {
  'deps.addEdge': () => addDepEdge('params', 'kpi'),
  'deps.flipEdge': () => flipDepEdge('params', 'financial'),
  'deps.removeEdge': () => removeDepEdge('params', 'duediligence'),
  'deps.setDescription': () => setDepDescription('params', 'A new description of the impact'),
  'deps.prune': () => applyPrunedDeps({ params: { financial: 'S' } }, {}),
};
