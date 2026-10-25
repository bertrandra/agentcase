import { setPersonaAppSection } from '@/controllers/appSections';
import type { Sample } from './types';

const BRAND = { id: 'brand-theme', personas: ['admin', 'builder', 'business-journey'] };
export const samples: Record<string, Sample> = {
  'persona.setAppSection': () => setPersonaAppSection('admin', BRAND, false),
};
