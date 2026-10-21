// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import LocStrat from '@/ui/sections/baseline/loc-strat';
import { appStore } from '@/store/instance';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtures';

afterEach(cleanup);
const target = (loc: string) => screen.getByLabelText(`Target share of ${loc}`) as HTMLInputElement;

describe('loc-strat section', () => {
  it.each([...PARITY_FIXTURES, 'baseline-mixed-team', 'team-large'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<LocStrat />);
    const legacy = legacySectionText(fx, 'loc-strat');
    if (legacy) expect(missingNumbers(legacy, renderedText(container))).toEqual([]);
    expect(renderedText(container)).toContain('Blended rate target');
  });
  it('golden figures: AS-IS 100% France, target 50/50, rate gap', () => {
    loadFixture('golden');
    const { container } = render(<LocStrat />);
    const t = renderedText(container);
    expect(t).toMatch(/100\s*%\s*·\s*15\.0\s*FTE/);
    expect(t).toMatch(/€536/);
    expect(t).toMatch(/-22%/);
    expect(t).toMatch(/100% → 50%/);
    expect(t).toMatch(/0% → 50%/);
  });
  it('editing the target mix moves the target rate, the engine follows, and undo restores', () => {
    const s = loadFixture('golden');
    render(<LocStrat />);
    const before = computeCase(s.getState().doc).model.tgtTJM;
    fireEvent.change(target('France'), { target: { value: '100' } });
    fireEvent.change(target('India'), { target: { value: '0' } });
    expect(s.getState().doc.targetLocPct).toMatchObject({ France: 100, India: 0 });
    expect(computeCase(s.getState().doc).model.tgtTJM).toBeGreaterThan(before);
    expect(screen.getByText(/Rate gap/).parentElement!.textContent).toMatch(/\+0%|-0%|0%/);
    act(() => { appStore().undo(); appStore().undo(); });
    expect(computeCase(s.getState().doc).model.tgtTJM).toBe(before);
    expect(target('France').value).toBe('50');
  });
  it('the target sum turns brick when it is not 100 %', () => {
    loadFixture('golden');
    const { container } = render(<LocStrat />);
    fireEvent.change(target('Portugal'), { target: { value: '30' } });
    const sum = [...container.querySelectorAll('strong')].find((e) => /^\d+%$/.test(e.textContent ?? ''))!;
    expect(sum.textContent).toBe('130%');
    expect(sum.style.color).toContain('brick');
  });
  it('Copy AS-IS resets the target to the team mix (undoable)', () => {
    const s = loadFixture('baseline-mixed-team');
    render(<LocStrat />);
    fireEvent.change(target('Portugal'), { target: { value: '30' } });
    const edited = s.getState().doc.targetLocPct;
    fireEvent.click(screen.getByText(/Copy AS-IS/));
    const t = s.getState().doc.targetLocPct!;
    expect(t.France).toBeCloseTo(((2 + 1.5 + 1.5) / 14.5) * 100, 1);
    expect(t.Portugal).toBeCloseTo((4 / 14.5) * 100, 1);
    expect(target('France').value).toBe(String(Math.round(t.France!)));
    act(() => { appStore().undo(); });
    expect(s.getState().doc.targetLocPct).toEqual(edited);
  });
  it('an empty team shows an em dash instead of an infinite rate gap', () => {
    const s = loadFixture('golden');
    act(() => { s.dispatch({ type: 'test', payload: null, label: 'empty team', undoable: false, run: (d) => { d.teamIn = []; } }); });
    render(<LocStrat />);
    expect(screen.getByText('Rate gap').previousSibling?.textContent).toBe('—');
  });
});
