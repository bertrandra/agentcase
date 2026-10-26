// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { readdirSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { runSimulation } from '@/controllers/stress';
import { STRESS } from '@/ui/sections/stress';
import { VERDICT } from '@/ui/sections/verdict';
import { renderedText } from '../../helpers/parity';
import { openFixture } from '../../helpers/stressParity';

afterEach(cleanup);
const FIXTURES = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const SECTIONS = { ...STRESS, ...VERDICT };

// Every migrated section of the group renders on every oracle fixture (horizons 1..10, empty scopes, supervision caps…), with and without a Monte Carlo run.
describe('stress and verdict sections render on every fixture', () => {
  it('registers the seven sections',
    () => expect(Object.keys(SECTIONS).sort()).toEqual(['compare', 'decision', 'montecarlo', 'results', 'scenarios', 'sensitivity', 'strategies']));
  it.each(FIXTURES)('%s', async (fx) => {
    for (const [id, load] of Object.entries(SECTIONS)) {
      const s = openFixture(fx);
      const { default: Cmp } = await load();
      const { container, unmount } = render(<Cmp />);
      if (id === 'decision' || id === 'results' || id === 'montecarlo') act(() => { runSimulation(100); });
      const text = renderedText(container);
      expect(text.length, `${id} on ${fx}`).toBeGreaterThan(200);
      expect(text, `${id} on ${fx}`).not.toMatch(/NaN|undefined|Infinity(?! \(no)/);
      unmount();
      expect(s.getState().history.undo).toHaveLength(0);   // rendering never edits the case
    }
  });
});
