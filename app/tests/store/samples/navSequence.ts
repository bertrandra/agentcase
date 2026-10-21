import { addSeqSection, addSeqStep, moveSeqSection, moveSeqStep, removeSeqSection, removeSeqStep, replaceSeq, setSeqEnabled, setSeqStepLabel } from '@/controllers/navSequence';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'seq.setEnabled': () => setSeqEnabled('builder', false),
  'seq.addStep': () => addSeqStep('builder'),
  'seq.removeStep': () => removeSeqStep('builder', 0),
  'seq.moveStep': () => moveSeqStep('builder', 0, 1),
  'seq.setStepLabel': () => setSeqStepLabel('builder', 0, 'Framing'),
  'seq.addSection': () => addSeqSection('builder', 0, 'home'),
  'seq.removeSection': () => removeSeqSection('builder', 0, 'engagement-context'),
  'seq.moveSection': () => moveSeqSection('builder', 0, 'engagement-context', 1),
  'seq.replace': () => replaceSeq('builder', { on: true, steps: [{ label: 'A', sections: ['home'] }] }),
};
