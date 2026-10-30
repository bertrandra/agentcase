import { readFileSync } from 'node:fs';
import { addProcessActivity } from '@/controllers/process';
import { importProcess, resetProcessTo } from '@/controllers/processImport';
import { moveProcessActivity, setProcessDiagram, setProcessRework } from '@/controllers/processLayout';
import { analyseImport, DEFAULT_CHOICES } from '@/domain/process';
import { editBase } from '@/store/editBase';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { CUSTOM } from './process';
import type { Sample } from './types';

/** The phase B4 process commands (docs/SPEC_BPMN.md § 9). */
const minimal = (): void => {
  const file = parseBpmn(readFileSync('fixtures/bpmn/minimal-agentcase.bpmn', 'utf8')).doc!;
  importProcess({ name: 'minimal.bpmn', file, analysis: analyseImport(editBase().BPMN, file) }, { ...DEFAULT_CHOICES, missing: 'outOfScope' });
};

export const samples: Record<string, Sample> = {
  'process.import': minimal,
  'process.reset': { prep: () => addProcessActivity(CUSTOM), run: () => resetProcessTo('V2') },
  'process.moveActivity': () => moveProcessActivity('A016', 'V4'),
  'process.setReworkFlow': () => setProcessRework('LP001', { probability: 0.2 }),
  'process.setDiagram': () => setProcessDiagram('A016', { x: 10, y: 20, w: 100, h: 80 }),
};
