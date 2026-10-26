import { describe, expect, it } from 'vitest';
import { FACTORY } from '@/ui/sections/factory';
import { MODEL_ENGINE } from '@/ui/sections/model-engine';
import { SECTION_COMPONENTS } from '@/ui/sections';
import { sectionById } from '@/ui/zones/registry';

const IDS = ['factory-model', 'release-pipeline', 'engineering', 'factory-timeline', 'model-convergence', 'model-supervision', 'model-flow', 'model-stochastic',
  'model-evidence', 'model-verification'];

describe('factory and model-engine sections are registered', () => {
  it('every section of both groups has a loader, a catalogue entry in its group, and resolves to a component', async () => {
    expect(Object.keys(FACTORY).sort()).toEqual(['engineering', 'factory-model', 'factory-timeline', 'release-pipeline']);
    expect(Object.keys(MODEL_ENGINE).sort()).toEqual(['model-convergence', 'model-evidence', 'model-flow', 'model-stochastic', 'model-supervision',
      'model-verification']);
    for (const id of IDS) {
      expect(sectionById(id), id).toBeTruthy();
      expect(SECTION_COMPONENTS[id], id).toBeTypeOf('function');
      expect(typeof (await SECTION_COMPONENTS[id]!()).default, id).toBe('function');
    }
  });
});
