import { resetMaturityMap, setAllReadiness, setCoef, setMaturityBound, setMaturityLabel, setReadiness } from '@/controllers/tuneA';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'maturity.setBound': () => setMaturityBound('ramp', 1, 40),
  'maturity.setLabel': () => setMaturityLabel(0, 'Beginner'),
  'maturity.reset': { prep: () => setMaturityBound('share', 2, 30), run: () => resetMaturityMap() },
  'readiness.set': () => setReadiness('doc', 0, '100'),
  'readiness.setAll': () => setAllReadiness(50),
  'tuneA.coefSet': () => setCoef('hriFloor', 'hriFloorCoef', '0.5'),
};
