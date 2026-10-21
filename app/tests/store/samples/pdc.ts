import { computeSensitivity, setAnchor, setAssumptValidated, setCoef, setDdState, setFgParam, setQualityAnchor } from '@/controllers/pdc';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'pdc.setAssumptValidated': () => setAssumptValidated('horizon', true),
  'pdc.setDdState': () => setDdState('cf-perfrel-cap', 'confirmed'),
  'pdc.setCoef': () => setCoef('hriFloor', 0.5),
  'pdc.setAnchor': () => setAnchor('DORA_ANCHORS', 'deployFreq', 'target', 20),
  'pdc.setQuality': () => setQualityAnchor(0, 2, 0.3),
  'pdc.setFgParam': () => setFgParam('sprintWeeks', 3),
  'pdc.setDdSensitivity': () => computeSensitivity(),
};
