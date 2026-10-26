// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { selectAllPhases } from '@/controllers/scope';
import { appStore } from '@/store/instance';
import AgentUsage from '@/ui/sections/verifyA/agent-usage';
import { statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const rows = (c: HTMLElement, t: number) =>
  [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((x) => x.textContent));

describe('agent-usage section', () => {
  // the legacy "relative agent effort" bar has no text: only its row label and the other cells are compared
  parityTests('agent-usage', AgentUsage);
  it('the headline figures follow the ramp and the token mix; undo restores them', () => {
    const { container } = render(<AgentUsage />);
    expect([statValue(container, 'Agent vFTE Y3'), statValue(container, 'Tokens Y3'), statValue(container, 'In-scope artifacts')])
      .toEqual(['11.3', '3094M', '10/53']);
    act(() => setInput('y3Ramp', 40));
    expect(statValue(container, 'Agent vFTE Y3')).not.toBe('11.3');
    act(() => appStore().undo());
    expect(statValue(container, 'Agent vFTE Y3')).toBe('11.3');
  });
  it('tokens per artifact scale the token volume and the horizon adds year rows', () => {
    const { container } = render(<AgentUsage />);
    act(() => setInput('tokensPerArt', 100000));
    expect(statValue(container, 'Tokens Y3')).toBe('6188M');
    act(() => setInput('horizon', 5));
    expect(rows(container, 0).map((r) => r[0])).toEqual(['Y1', 'Y2', 'Y3', 'Y4', 'Y5']);
    expect(statValue(container, 'Tokens Y5')).toBeDefined();
  });
  it('the shares by authorization level add up to 100% and the scope drives the phase table', () => {
    const { container } = render(<AgentUsage />);
    expect(rows(container, 2).reduce((s, r) => s + Number.parseInt(r[3] ?? '0'), 0)).toBeGreaterThanOrEqual(99);
    expect(rows(container, 1)).toHaveLength(3);
    act(() => selectAllPhases(true));
    expect(rows(container, 1).length).toBeGreaterThan(3);
  });
});
