import { addRecord, removeRecord, setField, togglePhaseFeature, toggleStoryArtefact } from '@/controllers/factory';
import * as fa from '@/controllers/factoryActions';
import type { Sample } from './types';

/** One call per Factory command type (completeness is asserted by the registry test). */
export const samples: Record<string, Sample> = {
  'factory.add': () => addRecord('EPICS'),
  'factory.set': { prep: () => addRecord('PORTFOLIO_ITEMS'), run: () => setField('PORTFOLIO_ITEMS', 'portfolio-1', 'name', 'Core') },
  'factory.remove': { prep: () => addRecord('PORTFOLIO_ITEMS'), run: () => removeRecord('PORTFOLIO_ITEMS', 'portfolio-1') },
  'factory.togglePhaseFeature': { prep: () => addRecord('FEATURES'), run: () => togglePhaseFeature('feature-1', 'V3', true) },
  'factory.toggleStoryArtefact': { prep: () => addRecord('STORIES'), run: () => toggleStoryArtefact('story-1', 'A017', false, true) },
  'factory.setVision': () => fa.setVision('Agent-assisted delivery'),
  'factory.addReleaseItem': { prep: () => addRecord('RELEASES'), run: () => fa.addReleaseItem('release-1', 'Fix', null, 'Fix upload timeout') },
  'factory.removeReleaseItem': { prep: () => { addRecord('RELEASES'); fa.addReleaseItem('release-1', 'Fix', null, 'x'); },
    run: () => fa.removeReleaseItem('ri-1') },
  'factory.setApprovalDecision': { prep: () => addRecord('APPROVALS'), run: () => fa.setApprovalDecision('appr-1', 'Approved') },
  'factory.feedbackToBacklog': { prep: () => addRecord('FEEDBACK_ITEMS'), run: () => fa.feedbackToBacklog('fb-1') },
  'factory.ipSetName': () => fa.setIpName('Claims platform'),
  'factory.ipToggleArtifact': () => fa.toggleIpArtifact('bart-1', true),
  'factory.ipAutoInclude': {
    prep: () => { addRecord('BUILDS'); addRecord('BUILD_ARTIFACTS'); addRecord('QUALITY_GATES'); setField('QUALITY_GATES', 'gate-1', 'result', 'Pass'); },
    run: () => fa.autoIncludePassing(),
  },
  'factory.loadDemo': () => fa.loadDemoDataset(),
  'factory.clearAll': { prep: () => fa.loadDemoDataset(), run: () => fa.clearFactoryData() },
  'factory.generate': () => fa.generateFactoryData(),
  'factory.setParam': () => fa.setGeneratorParam('density', 0.5),
  'factory.resetParams': { prep: () => fa.setGeneratorParam('density', 0.5), run: () => fa.resetGeneratorParams() },
};
