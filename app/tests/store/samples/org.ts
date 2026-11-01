import { addOrgUnit, clearActivityRaci, removeOrgUnit, setActivityRaci, setLaneRole, setProductOwner, setProductRaci, updateOrgUnit } from '@/controllers/org';
import { appStore } from '@/store/instance';
import type { Sample } from './types';

const VENDOR = { id: 'unit-1', name: 'Test vendor', type: 'vendor' as const, sourcing: 'vendor' as const };
export const samples: Record<string, Sample> = {
  'org.addUnit': () => addOrgUnit(VENDOR),
  'org.updateUnit': () => updateOrgUnit('unit-delivery', { name: 'Delivery centre', location: 'Lisbon' }),
  'org.removeUnit': { prep: () => addOrgUnit(VENDOR), run: () => removeOrgUnit('unit-1') },
  'org.setRaci': () => setActivityRaci('A017', { R: ['role-dev'], A: 'role-lead', C: ['role-arch'], I: [] }),
  // B10a: a product's owning unit (the default unit is written into the document when first chosen), then a unit at depth 2
  'org.setOwner': { prep: () => { addOrgUnit({ ...VENDOR, parent: 'unit-delivery' }); },
    run: () => setProductOwner(appStore().getState().portfolio.products[0]!.id, 'unit-1') },
  'org.setProductRaci': () => setProductRaci(appStore().getState().portfolio.products[0]!.id, 'A017', { R: ['role-dev'], A: 'role-lead', C: [], I: [] }),
  'org.setLaneRole': () => setLaneRole('orchestrator', 'role-lead'),
  'org.clearRaci': { prep: () => setActivityRaci('A017', { R: ['role-dev'], A: 'role-lead', C: [], I: [] }), run: () => clearActivityRaci('A017') },
};
