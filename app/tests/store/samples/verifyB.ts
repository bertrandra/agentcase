import { resetQuality, setPerfCoef, setQualityAsis, setQualityTarget } from '@/controllers/verifyB';
import type { Sample } from './types';

/** One sample call per command type of the verify group (second half). */
export const samples: Record<string, Sample> = {
  'quality.set': () => setQualityTarget(3, 2),
  'quality.reset': { prep: () => setQualityAsis(1, 50), run: () => resetQuality() },
  'coef.setPerf': () => setPerfCoef('perfRelCap', '1.1'),
};
