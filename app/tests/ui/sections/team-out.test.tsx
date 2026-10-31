// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTargetLoc } from '@/controllers/baseline';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import TeamOut from '@/ui/sections/verifyA/team-out';
import { statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';
import { deviationFixtures } from '../../helpers/deviations';
vi.mock('@/domain/programme/profile', async (orig) => (await import('../../helpers/legacyProgramme')).legacyProfileMock(orig));   // legacy parity, B9b

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const row = (c: HTMLElement, name: string) => [...c.querySelectorAll('tbody tr')].find((r) => r.children[0]?.textContent === name)!.children;

describe('team-out section', () => {
  // DEV-TEAM-RUN-END: past a 3-year horizon the run team (and the totals that add it) is the horizon end year's; asserted in tests/domain/verifyA.test.ts.
  const RUN_END = deviationFixtures('DEV-TEAM-RUN-END');
  parityTests('team-out', TeamOut, { moved: (fx) => (RUN_END.includes(fx)
    ? { skip: [0, 1], skipBands: ['Agentic run (en plus)', 'Total recurring target', 'Net reduction'] } : {}) });
  it('the input team and the automation depth drive the headline figures; undo restores them', () => {
    const { container } = render(<TeamOut />);
    expect([statValue(container, 'Input (FTE)'), statValue(container, 'Total recurring target'), statValue(container, 'Net reduction')])
      .toEqual(['15.0', '6.0', '-60%']);
    act(() => setInput('y3Ramp', 40));
    expect(statValue(container, 'Total recurring target')).not.toBe('6.0');
    act(() => appStore().undo());
    expect(statValue(container, 'Total recurring target')).toBe('6.0');
  });
  it('the target location mix of the Location strategy moves the target FTE by location', () => {
    const { container } = render(<TeamOut />);
    expect(row(container, 'India')[5]?.textContent).toBe('3.0');
    act(() => setTargetLoc('India', 100));
    expect(row(container, 'India')[4]?.textContent).toBe('67%');
    act(() => appStore().undo());
    expect(row(container, 'India')[5]?.textContent).toBe('3.0');
  });
  it('the group table adds up to the poles', () => {
    const { container } = render(<TeamOut />);
    expect([...container.querySelectorAll('table')[1]!.querySelectorAll('tbody tr')].map((r) => r.children[2]?.textContent))
      .toEqual(['3.3', '0.5', '2.3', '2.0']);
  });
});
