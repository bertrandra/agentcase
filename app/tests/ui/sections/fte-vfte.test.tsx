// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import FteVfte from '@/ui/sections/verifyA/fte-vfte';
import { statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('fte-vfte section', () => {
  parityTests('fte-vfte', FteVfte);
  it('an input edit moves the figures and the maturity level; undo restores them', () => {
    const { container } = render(<FteVfte />), before = statValue(container, 'Agent vFTE Y3');
    expect(container.textContent).toContain('L4 — AI orchestrates ◀ your case (Y3)');
    act(() => setInput('y3Ramp', 40));
    expect(statValue(container, 'Agent vFTE Y3')).not.toBe(before);
    expect(container.textContent).not.toContain('L4 — AI orchestrates ◀ your case');
    act(() => appStore().undo());
    expect(statValue(container, 'Agent vFTE Y3')).toBe(before);
    expect(container.textContent).toContain('L4 — AI orchestrates ◀ your case (Y3)');
  });
  it('conserves the total effort on every row and follows the horizon', () => {
    const { container } = render(<FteVfte />);
    act(() => setInput('horizon', 5));
    expect(statValue(container, 'Agent vFTE Y5')).toBeDefined();
    const rows = [...container.querySelectorAll('table')[0]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows).toHaveLength(7);   // AS-IS, two halves of Y1, Y2..Y5
    rows.forEach((r) => expect(r[4]).toBe('15.0'));
  });
});
