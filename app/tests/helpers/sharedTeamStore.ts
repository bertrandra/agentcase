import { addSharedLine } from '@/controllers/sharedTeam';
import { appStore } from '@/store/instance';
import { threeProducts } from './portfolioStore';

/** The live portfolio and document of the app store. */
export const pfNow = () => appStore().getState().portfolio;
export const docNow = () => appStore().getState().doc;
/** Three products (A, B in wave 1; C in wave 2) and one shared line of 2 FTE split 50 / 50 between A and B. */
export function sharedSetup() {
  const t = threeProducts(), [a, b] = t.ids, id = addSharedLine({ etp: 2, allocations: { [a]: 50, [b]: 50 } }) as string;
  return { ...t, id };
}
/** A workbook buffer as the `File`-like object the import reads. */
export const xlsxFile = (b: ArrayBuffer) => ({ name: 'pf.xlsx', size: b.byteLength, arrayBuffer: async () => b });
