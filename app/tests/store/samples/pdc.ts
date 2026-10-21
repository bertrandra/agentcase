import { setAssumptValidated } from '@/controllers/pdc';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'pdc.setAssumptValidated': () => setAssumptValidated('horizon', true),
};
