// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '@/store/instance';
import TobeTeam from '@/ui/sections/verifyA/tobe-team';
import { freshStore } from '../../store/helpers';
import { parityTests } from '../../helpers/verifyA';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const rows = (c: HTMLElement, t: number) =>
  [...c.querySelectorAll('table')[t]!.querySelectorAll('tbody tr, tfoot tr')].map((r) => [...r.children].map((x) => x.textContent));
/** Table order: 0 skill map, 1 composition, 2 location split, 3 location result. */
const comp = (c: HTMLElement) => rows(c, 1);

describe('tobe-team section', () => {
  // legacy table 3 is the skill-map editor: its select cells are blanked in the recording, the rest is compared
  parityTests('tobe-team', TobeTeam);
  it('composition reconciles with the model and the year buttons switch the year', () => {
    const { container } = render(<TobeTeam />);
    expect(container.textContent).toContain(
      'Reconciliation (Year 3): Σ human = 3.75 vs model human FTE = 3.75 · Σ agent vFTE = 11.25 vs model agent vFTE = 11.25');
    fireEvent.click(screen.getByText('Year 1'));
    expect(container.textContent).toContain('Reconciliation (Year 1)');
    expect(comp(container).slice(-1)[0]![0]).toBe('TOTAL');
  });
  it('editing the skill map moves the effort to another team skill; undo restores it', () => {
    const { container } = render(<TobeTeam />), before = comp(container);
    fireEvent.change(screen.getByLabelText('Team skill of Dev'), { target: { value: 'Lead' } });
    expect(comp(container).map((r) => r[0])).toContain('Lead');
    expect(comp(container)).not.toEqual(before);
    act(() => { appStore().undo(); });
    expect(comp(container)).toEqual(before);
    fireEvent.change(screen.getByLabelText('Team skill of Dev'), { target: { value: 'Lead' } });
    fireEvent.click(screen.getByText('↺ Reset mapping to defaults'));
    expect(comp(container)).toEqual(before);
  });
  it('the location split prices the residual team by location; reset returns to the AS-IS mix; undo works', () => {
    const { container } = render(<TobeTeam />);
    expect(rows(container, 3).map((r) => r[0])).toEqual(['France Local', 'TOTAL']);
    fireEvent.change(screen.getByLabelText('Dev share in India'), { target: { value: '50' } });
    expect(rows(container, 3).map((r) => r[0])).toContain('India Offshore');
    expect(rows(container, 2).find((r) => r[0] === 'Dev')!.slice(-1)[0]).toBe('150%');
    act(() => { appStore().undo(); });
    expect(rows(container, 3).map((r) => r[0])).toEqual(['France Local', 'TOTAL']);
    fireEvent.change(screen.getByLabelText('Dev share in India'), { target: { value: '50' } });
    fireEvent.click(screen.getByText('↺ Reset split to AS-IS mix'));
    expect(rows(container, 2).find((r) => r[0] === 'Dev')!.slice(-1)[0]).toBe('100%');
  });
  it('a share is clamped to 0..100', () => {
    render(<TobeTeam />);
    fireEvent.change(screen.getByLabelText('Dev share in India'), { target: { value: '250' } });
    expect((screen.getByLabelText('Dev share in India') as HTMLInputElement).value).toBe('100');
  });
});
