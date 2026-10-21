import { applyParamsImport } from '@/controllers/excelParams';
import type { Sample } from './types';

/** The import command with an already-read patch (the file → patch part is covered by excel-params-*.test.ts). */
export const samples: Record<string, Sample> = {
  'excel.importParams': () => applyParamsImport({ customerName: 'Imported Co', QUALITY: [['Bugs/1000 LOC', 3, 0.4, 'DORA']] }),
};
