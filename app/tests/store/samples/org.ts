import { addOrgUnit, clearActivityRaci, removeOrgUnit, setActivityRaci, updateOrgUnit } from '@/controllers/org';
import type { Sample } from './types';

const VENDOR = { id: 'unit-1', name: 'Test vendor', type: 'vendor' as const, sourcing: 'vendor' as const };
export const samples: Record<string, Sample> = {
  'org.addUnit': () => addOrgUnit(VENDOR),
  'org.updateUnit': () => updateOrgUnit('unit-delivery', { name: 'Delivery centre', location: 'Lisbon' }),
  'org.removeUnit': { prep: () => addOrgUnit(VENDOR), run: () => removeOrgUnit('unit-1') },
  'org.setRaci': () => setActivityRaci('A017', { R: ['role-dev'], A: 'role-lead', C: ['role-arch'], I: [] }),
  'org.clearRaci': { prep: () => setActivityRaci('A017', { R: ['role-dev'], A: 'role-lead', C: [], I: [] }), run: () => clearActivityRaci('A017') },
};
