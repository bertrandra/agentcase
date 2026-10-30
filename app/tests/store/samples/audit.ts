import { applyAuditImport, applyCalibration, editAudit, editToolCatalog, setHeader } from '@/controllers/audit';
import type { Sample } from './types';

const NOW = new Date('2026-10-30T12:00:00Z');
export const samples: Record<string, Sample> = {
  'audit.editElement': () => editAudit('A017', { kind: 'observation', obs: { name: 'reworkRate', value: '12', source: 'interview' } }),
  'audit.setHeader': () => setHeader({ client: 'Acme', status: 'inProgress' }, NOW),
  'audit.catalog': () => editToolCatalog({ kind: 'retire', code: 'selenium', retired: true }),
  'audit.calibrate': {
    prep: () => editAudit('A017', { kind: 'observation', obs: { name: 'automationLevel', value: 'agentic' } }),
    run: () => applyCalibration([{ element: 'A017', param: 'aiAuthority', from: '', to: 'Autonomous', formula: 'automation level "agentic"' }], 'test', NOW),
  },
  'audit.importWorkbook': () => applyAuditImport([{ id: 'A023', op: { kind: 'tool', use: { ref: 'playwright' } } }]),
};
