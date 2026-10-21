import { setCaseDiscountRate, setCustomerName, setEngageCoef, setEngagementCtx, setIndustry, setRegInclude, setRegUse, setTrackActual, toggleCross, toggleNorm } from '@/controllers/frame';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'frame.setCustomerName': () => setCustomerName('Acme Corp'),
  'frame.setEngagementCtx': () => setEngagementCtx('STA'),
  'frame.setCaseDiscountRate': () => setCaseDiscountRate('0.12'),
  'frame.setEngageCoef': () => setEngageCoef('MSI', 'rampSpeed', 0.7),
  'frame.setTrackActual': () => setTrackActual('q2', 'ad', 40),
  'frame.setRegUse': () => setRegUse(true),
  'frame.setIndustry': { prep: () => setRegUse(true), run: () => setIndustry('MED') },
  'frame.toggleNorm': () => toggleNorm('MED', 'ISO 13485', true),
  'frame.toggleCross': () => toggleCross('AI', true),
  'frame.setRegInclude': () => setRegInclude(false),
};
