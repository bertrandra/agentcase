import { selectAllPhases, setSeq, toggleRegArtefact } from '@/controllers/scope';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'scope.toggleRegArtefact': () => toggleRegArtefact('R001', true),
  'scope.selectAll': () => selectAllPhases(true),
  'scope.setSeq': () => setSeq('phase', 'V1', 7),
};
