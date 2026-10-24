// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThemeAxes } from '@/domain/theme/axes';
import { applyThemeAxes } from '@/ui/themeAxes';
import Setup from '@/ui/sections/tune/setup';
import Risk from '@/ui/sections/tune/risk';
import LcWeighting from '@/ui/sections/scope/lc-weighting';
import EngagementContext from '@/ui/sections/frame/engagement-context';
import TeamIn from '@/ui/sections/baseline/team-in';
import { freshStore } from '../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

/**
 * axe-core on input sections rendered with every control variant and with the compact / spacious densities (colour contrast needs a browser:
 * tools/a11y.mjs covers it on the default theme). A variant must keep every control named, every group labelled, no duplicate id.
 */
afterEach(() => { applyThemeAxes({}); cleanup(); });
const SECTIONS = { setup: Setup, risk: Risk, 'lc-weighting': LcWeighting, 'engagement-context': EngagementContext, 'team-in': TeamIn };
const THEMES: Record<string, Partial<ThemeAxes>> = {
  'stepper + segmented + switch, compact': { controlsNumeric: 'stepper', controlsChoice: 'segmented', controlsBoolean: 'switch', density: 'compact' },
  'slider + radio, spacious': { controlsNumeric: 'slider', controlsChoice: 'radio', density: 'spacious', radius: 'round', box: 'elevated' },
  'slider-field + dropdown + checkbox, compact': { controlsNumeric: 'slider-field', controlsChoice: 'dropdown', controlsBoolean: 'checkbox', density: 'compact', radius: 'square', box: 'flat' },
  'number fields everywhere': { controlsNumeric: 'number' },
};
const audit = (c: HTMLElement): Promise<string[]> => axeViolations(c, { region: false });

describe('Field* variants: no axe violation on the input sections', () => {
  for (const [theme, axes] of Object.entries(THEMES)) {
    it.each(Object.keys(SECTIONS))(`${theme}: %s`, async (id) => {
      freshStore();
      applyThemeAxes(axes);
      const Section = SECTIONS[id as keyof typeof SECTIONS];
      const { container } = render(<Section />);
      expect(await audit(container)).toEqual([]);
    });
  }
  it('the variants are really rendered (the audit is not of the default controls)', () => {
    freshStore();
    applyThemeAxes(THEMES['stepper + segmented + switch, compact']!);
    const { container } = render(<><Setup /><Risk /><EngagementContext /></>);
    expect(container.querySelectorAll('.ac-fv-stepper').length).toBeGreaterThan(5);
    expect(container.querySelectorAll('[role="radiogroup"]').length).toBeGreaterThan(5);
    expect(container.querySelectorAll('[role="switch"]').length).toBeGreaterThan(1);
  });
});
