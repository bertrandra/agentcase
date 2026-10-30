import { bindProcessDecision, importDecisions, importRunCase } from '@/controllers/decisions';
import { addProcessActivity } from '@/controllers/process';
import { cmmnDocument } from '@/domain/cmmn';
import { dmnFile, FAMILY_IDS, ruleFamilies, writeDmn } from '@/domain/dmn';
import { readProcess, serialize } from '@/domain/process';
import { editBase } from '@/store/editBase';
import { parseXml } from '@/store/persistence/bpmn/read';
import type { Sample } from './types';

/** The phase B7b commands (docs/SPEC_BPMN.md F-B62, F-B63): decisions imported, a run case read back, a rule task bound. */
const runCase = (): void => {
  const d = editBase().BPMN, id = readProcess(d).activities.find((a) => a.phase === 'L9')?.id ?? '';
  const text = serialize(cmmnDocument(d, 'x')).replace(new RegExp(`(id="${id}" name=")[^"]*"`), '$1Renamed"');
  importRunCase('run.cmmn', parseXml(text).doc?.root ?? d.root);
};
export const samples: Record<string, Sample> = {
  'process.importDecisions': () => { importDecisions('rules.dmn', dmnFile(writeDmn(ruleFamilies([]))).root); },
  'process.importCmmn': runCase,
  'process.bindDecision': {
    prep: () => addProcessActivity({ id: 'C010', name: 'Rule', phase: 'V3', value: 'NVA', skill: 'Dev', aiAuth: 'Copilot', humanSup: 50, agentSup: 50,
      effort: 1, deliverable: '', agentActivityType: 'BusinessRule' }),
    run: () => bindProcessDecision('C010', FAMILY_IDS.authority),
  },
};
