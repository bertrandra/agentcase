import { addTokenModel, removeTokenModel, resetLifecycleCoefficients, resetTokenModels, setCoef, setStatusPosture, setTokenField,
  setTokenOutShare } from '@/controllers/tuneB';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'tuneB.coef.set': () => setCoef('supShareCap', 0.3, 'runSupShareCap'),
  'tuneB.token.setField': () => setTokenField(1, 'mix', '45'),
  'tuneB.token.add': () => addTokenModel(),
  'tuneB.token.remove': () => removeTokenModel(0),
  'tuneB.token.reset': { prep: () => setTokenField(1, 'priceIn', '9'), run: () => resetTokenModels() },
  'tuneB.token.setOutShare': () => setTokenOutShare(50),
  'tuneB.lifecycle.setPosture': () => setStatusPosture('growth', 1.3),
  'tuneB.lifecycle.reset': { prep: () => setStatusPosture('growth', 1.3), run: () => resetLifecycleCoefficients() },
};
