import { readFileSync } from 'node:fs';
import { addProcessActivity } from '@/controllers/process';
import { importProcess, resetProcessTo } from '@/controllers/processImport';
import { addCanvasActivity, addProcessLink, linkProcessActivities, moveProcessActivity, placeProcessActivity, reconnectProcessLink, removeProcessLink,
  setProcessActivityRole, setProcessDiagram, setProcessRework } from '@/controllers/processLayout';
import { addToProcessSub, createProcessSub, deleteProcessSub } from '@/controllers/processSubs';
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
  'process.linkActivities': { prep: () => addProcessActivity(CUSTOM), run: () => { linkProcessActivities(); } },
  'process.setDiagram': () => setProcessDiagram('A016', { x: 10, y: 20, w: 100, h: 80 }),
  // the canvas edits (owner, 2026-11-04)
  'process.placeActivity': () => placeProcessActivity('A003', 'L0', 'Dev'),
  'process.setActivityRole': () => setProcessActivityRole('A003', 'role-qa'),
  'process.addActivityAt': () => { addCanvasActivity('L0'); },
  'process.addLink': () => { addProcessLink('A001', 'A003'); },
  'process.removeLink': () => removeProcessLink('Flow_A001_A002'),
  'process.createSubProcess': () => { createProcessSub(['A002', 'A003']); },
  'process.addToSubProcess': { prep: () => { createProcessSub(['A002']); }, run: () => { addToProcessSub('Sub_1', 'A003'); } },
  'process.deleteSubProcess': { prep: () => { createProcessSub(['A002']); }, run: () => deleteProcessSub('Sub_1') },
  'process.reconnectLink': () => { reconnectProcessLink('Flow_A001_A002', 'target', 'A003'); },
};
