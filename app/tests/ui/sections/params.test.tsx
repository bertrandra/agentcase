// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setPhaseAgent } from '@/controllers/artefacts';
import Params from '@/ui/sections/scope/params';
import { expectLikeFixture, loadFixture, modelOf, SECTION_FIXTURES } from '../../helpers/scopeToolsFixtures';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
const scrub = (month: number) => fireEvent.change(screen.getByLabelText('Month within the horizon'), { target: { value: String(month) } });
const slider = (name: RegExp | string) => screen.getByRole('slider', { name }) as HTMLInputElement;
// Legacy discrepancy (stale snapshot): the industry-med fixture stores autoPotential 75 while fit-to-scope gives 46. The legacy engine (oracle) computes with the stored 75,
// but the text dump walks through the Scope tab first, whose render refits the slider to 46. Only the two funnel figures derived from the refit potential differ.
const IGNORE: Record<string, number[]> = { 'industry-med': [21.2, 20.2] };

describe('params section', () => {
  it.each(SECTION_FIXTURES)('shows every figure the legacy section showed, funnel at month 1 (%s)', (fx) => {
    loadFixture(fx);
    const legacy = legacySectionText(fx, 'params');
    expect(legacy).not.toBeNull();
    const { container } = render(<Params />);
    scrub(1);                                           // the legacy page was captured while the funnel replay was at month 1
    expect(missingNumbers(legacy!, renderedText(container), IGNORE[fx])).toEqual([]);
  });

  it('fit-to-scope locks the potential slider; unticking it frees the slider and a manual 60 equals the legacy fixture fit-off-manual', () => {
    const s = loadFixture('golden');
    render(<Params />);
    expect(slider(/Potential/).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Fit to selected scope/));
    expect(slider(/Potential/).disabled).toBe(false);
    fireEvent.change(slider(/Potential/), { target: { value: '60' } });
    expect(s.getState().doc.dom.values.autoPotential).toBe('60');
    expectLikeFixture(s, 'fit-off-manual');
    expect(modelOf(s).auto).toBe(60);
    act(() => { s.undo(); s.undo(); });
    expectLikeFixture(s, 'golden');
    expect(slider(/Potential/).disabled).toBe(true);
  });

  it('the technical cap (committed on blur) bounds the potential like the legacy fixture auto-cap-60; undo restores', () => {
    const s = loadFixture('golden');
    render(<Params />);
    const cap = screen.getByLabelText('Technical automation cap');
    fireEvent.change(cap, { target: { value: '6' } });            // typing "6" on the way to "60" is not clamped to 10 yet
    expect(s.getState().doc.dom.values.autoCapPct).toBe('100');
    fireEvent.change(cap, { target: { value: '60' } });
    fireEvent.blur(cap);
    expect(s.getState().doc.dom.values.autoCapPct).toBe('60');
    expect(s.getState().doc.dom.values.autoPotential).toBe('60');
    expect(slider(/Potential/).max).toBe('60');
    expectLikeFixture(s, 'auto-cap-60');
    expect(modelOf(s).eff).toBeLessThan(75);
    act(() => { s.undo(); });
    expectLikeFixture(s, 'golden');
    expect((cap as HTMLInputElement).value).toBe('100');
  });

  it('the glass ceiling is derived (slider locked, shows the scope value); forcing 40 equals the legacy fixture force-ceiling-40', () => {
    const s = loadFixture('golden');
    render(<Params />);
    expect(slider('Glass ceiling').disabled).toBe(true);
    expect(slider('Glass ceiling').value).toBe('25');
    fireEvent.click(screen.getByLabelText(/Force this value/));
    expect(s.getState().doc.forceGlassCeiling).toBe(true);
    expect(slider('Glass ceiling').disabled).toBe(false);
    fireEvent.change(slider('Glass ceiling'), { target: { value: '40' } });
    expectLikeFixture(s, 'force-ceiling-40');
    expect(modelOf(s).ceiling).toBe(40);
    expect(screen.getByText('Glass ceiling: 40%')).toBeTruthy();
    act(() => { s.undo(); s.undo(); });
    expectLikeFixture(s, 'golden');
    expect(s.getState().doc.forceGlassCeiling).toBe(false);
  });

  it('the funnel scrubs through the horizon (month 18 is mid-ramp) and the chart legend toggles add lines and tags', () => {
    loadFixture('golden');
    const { container } = render(<Params />);
    scrub(18);
    expect(renderedText(container)).toMatch(/Month\s*18\s*of\s*36/);
    expect(renderedText(container)).toMatch(/29\.1\s*%/);           // realized depth at month 18 (legacy afStages: 29.0625)
    scrub(36);
    expect(screen.getByText(/Replay/)).toBeTruthy();
    expect(renderedText(container)).toMatch(/not the\s*75\.0\s*%\s*potential/);
    expect(renderedText(container)).not.toMatch(/Human FTE\s*40%/);
    fireEvent.click(screen.getByLabelText('Residual human FTE'));
    expect(renderedText(container)).toMatch(/Human FTE\s*40%/);
    expect(container.querySelectorAll('svg path[stroke-dasharray="6 3"]')).toHaveLength(1);
  });

  it('the chart and the funnel follow the document: raising V1 to 100 % auto moves potential, ceiling and the realized end', () => {
    const s = loadFixture('golden'), before = modelOf(s);
    const { container } = render(<Params />);
    act(() => { setPhaseAgent('V1', 100); });
    const m = modelOf(s);
    expect(m.auto).toBeGreaterThan(before.auto);
    expect(m.ceiling).toBeLessThan(before.ceiling);
    expect(renderedText(container)).toMatch(new RegExp(`Potential\\s*${Math.round(m.auto)}%`));
    expect(slider(/Potential/).value).toBe(String(m.auto));
    expect(slider('Glass ceiling').value).toBe(String(Math.round(m.ceiling)));
    act(() => { s.undo(); });
    expect(slider(/Potential/).value).toBe(String(before.auto));
  });
});
