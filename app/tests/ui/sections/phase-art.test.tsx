// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setInput } from '@/controllers/inputs';
import { selectAllPhases } from '@/controllers/scope';
import { appStore } from '@/store/instance';
import PhaseArt from '@/ui/sections/verifyA/phase-art';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const rows = (c: HTMLElement, t: number) => [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr')].map((r) => [...r.children].map((x) => x.textContent));

describe('phase-art section', () => {
  parityTests('phase-art', PhaseArt, { mask: /vFTE Y\d+ \(relative\)/ });   // legacy header says Y3 whatever the horizon: the figures are the horizon end's
  it('an artefact edit moves the phase averages and the floor; undo restores them', () => {
    const { container } = render(<PhaseArt />), before = rows(container, 1);
    expect(before[1]).toEqual(['V3', 'Implementation', '5', '27%', '73%', '2.3']);
    act(() => setAgentSup('A017', 100));
    expect(rows(container, 1)[1]![4]).not.toBe('73%');
    expect(rows(container, 0)[1]![1]).not.toBe('28%');
    act(() => appStore().undo());
    expect(rows(container, 1)).toEqual(before);
  });
  it('the ramp changes the projected human share, never below the floor', () => {
    const { container } = render(<PhaseArt />);
    act(() => setInput('y3Ramp', 20));
    act(() => setInput('y1Ramp', 5));
    for (const r of rows(container, 0)) expect(Number.parseInt(r[2]!)).toBeGreaterThanOrEqual(Number.parseInt(r[1]!));
    expect(container.textContent).toContain('Human share Y3');
  });
  it('lists every phase of the scope and the horizon end in the header', () => {
    const { container } = render(<PhaseArt />);
    act(() => selectAllPhases(true));
    expect(rows(container, 1).length).toBeGreaterThan(3);
    act(() => setInput('horizon', 5));
    expect(container.querySelectorAll('table')[1]!.textContent).toContain('vFTE Y5 (relative)');
  });
});
