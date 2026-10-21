// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType } from 'react';
import { TUNE } from '@/ui/sections/tune';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { extra, extraIds, loadFixture } from '../../helpers/tuneA';

// Every figure the legacy render hosts showed (tools/oracle-extras.d/tuneA.mjs, *Text extras) must appear in the migrated section,
// on every fixture case — not only on the four text dumps of the per-section tests.
const ids = extraIds('tuneAMaturity');
const load = async (section: string) => (await (TUNE[section] as () => Promise<{ default: ComponentType }>)()).default;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);                       // jsdom has no canvas: Chart.js logs, ChartPanel tolerates
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(cleanup);

const CHECKS: { section: string; extras: string[]; before?: () => void }[] = [
  { section: 'maturity-map', extras: ['tuneAMaturityMapText'] },
  { section: 'maturity', extras: ['tuneAMaturityTabText'] },
  { section: 'readiness', extras: ['tuneAHriText'] },
  { section: 'readiness', extras: ['tuneAReadinessText'], before: () => fireEvent.click(screen.getByRole('tab', { name: 'Assessment questionnaire' })) },
  { section: 'eligibility', extras: ['tuneAEligibilityText'] },
  { section: 'program', extras: ['tuneAProgramText'] },
  { section: 'opmodel', extras: ['tuneAOpmodelText'] },
];

describe('legacy render hosts, every fixture case', () => {
  it.each(ids)('%s', async (id) => {
    for (const { section, extras, before } of CHECKS) {
      loadFixture(id);
      const Section = await load(section);
      const { container } = render(<Section />);
      before?.();
      const rendered = renderedText(container);
      for (const name of extras) expect({ section, name, missing: missingNumbers(extra<string>(name, id), rendered) }).toEqual({ section, name, missing: [] });
      cleanup();
    }
  }, 60000);
});
