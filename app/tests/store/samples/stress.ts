import { applyStrategy, resetMcRanges, resetStrategies, resetStratWeights, setMcAuto, setMcSpread, setStratDeclared, setStratLever, setStratSplit,
  setStratSplitMode, setStratWeight } from '@/controllers/stress';
import type { Sample } from './types';

/** One sample call per command of the stress / verdict controllers. */
export const samples: Record<string, Sample> = {
  'mc.setSpread': () => setMcSpread('y3Ramp', '25'),
  'mc.resetRanges': { prep: () => setMcSpread('y3Ramp', '25'), run: () => resetMcRanges() },
  'mc.setAuto': () => setMcAuto(false),
  'strategy.setLever': () => setStratLever('hybrid', 'auto', '55'),
  'strategy.setDeclared': () => setStratDeclared('tm', 'risk', '5'),
  'strategy.setSplitMode': () => setStratSplitMode('tm', 'custom'),
  'strategy.setSplit': () => setStratSplit('service', 'France', '60'),
  'strategy.resetAll': { prep: () => setStratLever('hybrid', 'auto', '55'), run: () => resetStrategies() },
  'strategy.setWeight': () => setStratWeight('roi', '60'),
  'strategy.resetWeights': { prep: () => setStratWeight('roi', '60'), run: () => resetStratWeights() },
  'strategy.apply': () => applyStrategy('hybrid'),
};
