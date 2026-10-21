// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setTeamTotal } from '@/controllers/baseline';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import AgentDetail from '@/ui/sections/verifyA/agent-detail';
import { statValue } from '../../helpers/economics';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const rows = (c: HTMLElement, t: number) => [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((x) => x.textContent));
/** Table order: 0 agent runs by artifact, 1 the five roles, 2 authorization levels. */

describe('agent-detail section', () => {
  parityTests('agent-detail', AgentDetail);
  it('the roles are sized from the input team; undo restores them', () => {
    const { container } = render(<AgentDetail />);
    expect(rows(container, 1).map((r) => r[3])).toEqual(['1.25', '0.75', '0.47', '0.50', '0.60']);
    expect(statValue(container, 'Agentic Run FTE')).toBe('3.1');
    act(() => setTeamTotal(30));
    expect(rows(container, 1)[0]![3]).toBe('2.50');
    expect(statValue(container, 'Agentic Run FTE')).not.toBe('3.1');
    act(() => appStore().undo());
    expect(rows(container, 1)[0]![3]).toBe('1.25');
  });
  it('the agent runs follow runs per day and the total row adds the lines up', () => {
    const { container } = render(<AgentDetail />), total = () => rows(container, 0).slice(-1)[0]!;
    const sum = () => rows(container, 0).slice(0, -1).reduce((s, r) => s + Number((r[6] ?? '').replace(/,/g, '')), 0);
    const before = total()[4];
    expect(Math.abs(sum() - Number((before ?? '').replace(/,/g, '')))).toBeLessThan(10);
    act(() => setInput('runsPerDay', 50));
    expect(total()[4]).not.toBe(before);
    act(() => appStore().undo());
    expect(total()[4]).toBe(before);
  });
  it('an artefact moved to another authorization level changes the level table', () => {
    const { container } = render(<AgentDetail />);
    const lvl = () => rows(container, 2).map((r) => r[4]);
    const before = lvl();
    act(() => setAgentSup('A017', 5));
    expect(lvl()).not.toEqual(before);
  });
});
