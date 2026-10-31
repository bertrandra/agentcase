import { addOrgUnit } from '@/controllers/org';
import { addProduct } from '@/controllers/product';
import { addSharedLine, clearSharedPins, removeSharedLine, setSharedPins, setSharedShare, updateSharedLine } from '@/controllers/sharedTeam';
import { setSharedLineSplit, setSharedLineUnit, setUnitService } from '@/controllers/services';
import { appStore } from '@/store/instance';
import type { Sample } from './types';

const first = (): string => appStore().getState().portfolio.products[0]!.id;
let line = '';
const withLine = () => { addProduct('Second'); line = addSharedLine({ allocations: { [first()]: 50 } }) ?? ''; };

const withService = () => { addOrgUnit({ id: 'qa', name: 'QA service', type: 'centreOfExcellence' }); setUnitService('qa', true); };

/** One sample call per shared-team command. */
export const samples: Record<string, Sample> = {
  'sharedTeam.add': () => { addSharedLine({ etp: 1 }); },
  'sharedTeam.edit': { prep: withLine, run: () => { updateSharedLine(line, 'etp', 3); } },
  'sharedTeam.remove': { prep: withLine, run: () => { removeSharedLine(line); } },
  'sharedTeam.setShare': { prep: withLine, run: () => { setSharedShare(line, first(), 80); } },
  'sharedTeam.setPins': { prep: withLine, run: () => { setSharedPins(line, ['A001'], true); } },
  // B10c: a line joins a shared-service unit (it holds a share: kept as its override), then is split by effort
  'sharedTeam.setUnit': { prep: () => { withLine(); withService(); }, run: () => { setSharedLineUnit(line, 'qa'); } },
  'sharedTeam.setSplit': { prep: () => { withLine(); withService(); setSharedLineUnit(line, 'qa'); }, run: () => { setSharedLineSplit(line, 'effort'); } },
  'sharedTeam.clearPins': { prep: () => { withLine(); setSharedPins(line, ['A001'], true); }, run: () => { clearSharedPins(line); } },
};
