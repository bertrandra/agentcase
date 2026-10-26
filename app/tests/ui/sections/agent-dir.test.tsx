// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import AgentDir from '@/ui/sections/verifyA/agent-dir';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const rows = (c: HTMLElement, t: number) =>
  [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((x) => x.textContent));
const calc = () => computeCase(appStore().getState().doc);

describe('agent-dir section', () => {
  // legacy table 0 lists every agent; the phase selector is a form input persisted with the case
  parityTests('agent-dir', AgentDir);
  it('the phase selector filters the agents and the roles; undo restores the full directory', () => {
    const { container } = render(<AgentDir />);
    expect(rows(container, 0)).toHaveLength(16);
    fireEvent.change(screen.getByLabelText('Phase'), { target: { value: 'V4' } });
    const agents = rows(container, 0);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.length).toBeLessThan(16);
    expect(agents.every((r) => /A02[2-9]|A03[0-4]/.test(r[6] ?? ''))).toBe(true);
    expect(rows(container, 1).map((r) => r[0])).toEqual(['Dev', 'Test/QA']);
    act(() => { appStore().undo(); });
    expect(rows(container, 0)).toHaveLength(16);
  });
  it('a phase without any agent says so', () => {
    const { container } = render(<AgentDir />);
    fireEvent.change(screen.getByLabelText('Phase'), { target: { value: 'Cross-cutting' } });
    expect(container.textContent).toContain('No agent active for this phase');
    expect(container.textContent).toContain('No role active for this phase');
  });
  it('the internal loop adds a token-cost estimate that never changes the case; the external rework does', () => {
    const { container } = render(<AgentDir />), before = calc().model.yearSav[2];
    expect(rows(container, 2)[0]![5]).toBe('—');
    fireEvent.click(screen.getByLabelText(/Apply internal loop/));
    expect(rows(container, 2)[0]![5]).toMatch(/^\d+\.\d\dM tok$/);
    expect(calc().model.yearSav[2]).toBe(before);
    fireEvent.click(screen.getByLabelText(/Apply external rework/));
    expect(rows(container, 2)[0]![6]).toMatch(/^\+\d+\.\d w → V3$/);
    expect(calc().model.yearSav[2]).toBeLessThan(before as number);
    act(() => { appStore().undo(); });
    expect(rows(container, 2)[0]![6]).toBe('not applied');
  });
});
