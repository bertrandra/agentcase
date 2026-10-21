import { resetSkillMap, resetTobeLoc, setSkillMap, setTobeLoc } from '@/controllers/verifyA';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'verify.setSkillMap': () => setSkillMap('Dev', 'Lead'),
  'verify.resetSkillMap': { prep: () => setSkillMap('Dev', 'Lead'), run: () => resetSkillMap() },
  'verify.setTobeLoc': () => setTobeLoc('Dev', 'India', 40),
  'verify.resetTobeLoc': { prep: () => setTobeLoc('Dev', 'India', 40), run: () => resetTobeLoc() },
};
