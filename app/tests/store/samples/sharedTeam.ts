import { addProduct } from '@/controllers/product';
import { addSharedLine, removeSharedLine, setSharedShare, updateSharedLine } from '@/controllers/sharedTeam';
import { appStore } from '@/store/instance';
import type { Sample } from './types';

const first = (): string => appStore().getState().portfolio.products[0]!.id;
let line = '';
const withLine = () => { addProduct('Second'); line = addSharedLine({ allocations: { [first()]: 50 } }) ?? ''; };

/** One sample call per shared-team command. */
export const samples: Record<string, Sample> = {
  'sharedTeam.add': () => { addSharedLine({ etp: 1 }); },
  'sharedTeam.edit': { prep: withLine, run: () => { updateSharedLine(line, 'etp', 3); } },
  'sharedTeam.remove': { prep: withLine, run: () => { removeSharedLine(line); } },
  'sharedTeam.setShare': { prep: withLine, run: () => { setSharedShare(line, first(), 80); } },
};
