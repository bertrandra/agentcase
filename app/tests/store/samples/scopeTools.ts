import { addCurvePoint, moveCurvePoint, removeCurvePoint, setAutoCap, setCurveFamily, setForceGC } from '@/controllers/scopeTools';
import type { Sample } from './types';

/** One sample call per command type of controllers/scopeTools.ts. */
export const samples: Record<string, Sample> = {
  'params.setAutoCap': () => setAutoCap(60),
  'params.setForceGC': () => setForceGC(true),
  'scurve.setFamily': () => setCurveFamily('logistic'),
  'scurve.addPoint': () => addCurvePoint(),
  'scurve.removePoint': { prep: () => addCurvePoint(), run: () => removeCurvePoint() },
  'scurve.movePoint': () => moveCurvePoint(1, 20, 50),
};
