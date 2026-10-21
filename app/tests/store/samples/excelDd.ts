import { applyDdPackEntries } from '@/controllers/excelDd';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'dd.importPack': () => applyDdPackEntries([{ id: 'cf-perfrel-cap', st: 'confirmed', owner: 'Ann', dueDate: '2026-01-02', note: 'checked' }]),
};
