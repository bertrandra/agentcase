import { applyParamsImport, applyPortfolioImport } from '@/controllers/excelParams';
import { addProduct } from '@/controllers/product';
import { renameProduct, setHub } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import type { Sample } from './types';

/** The import command with an already-read patch (the file → patch part is covered by excel-params-*.test.ts). */
export const samples: Record<string, Sample> = {
  'excel.importParams': () => applyParamsImport({ customerName: 'Imported Co', QUALITY: [['Bugs/1000 LOC', 3, 0.4, 'DORA']] }),
  'excel.importPortfolio': {
    prep: () => { addProduct('Second'); },
    run: () => { const pf = appStore().getState().portfolio; applyPortfolioImport(setHub(renameProduct(pf, pf.products[0]!.id, 'Imported'), { infraMonthly: 4321 })); },
  },
};
