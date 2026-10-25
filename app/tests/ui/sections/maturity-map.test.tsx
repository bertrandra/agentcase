// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase, makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { appStore } from '@/store/instance';
import MaturityMap from '@/ui/sections/tune/maturity-map';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadFixture } from '../../helpers/tuneA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc as unknown as { MATURITY_MAP: { rampBounds: number[]; shareBounds: number[]; labels: string[] } };
const l2Month = () => engineNow(makeCtx(appStore().getState().doc)).milestones().find((m) => m.level === 'L2')?.month ?? 0;
const bound = (kind: 'Adoption' | 'Agent vFTE share', level: number) => screen.getByLabelText(`${kind} threshold of L${level}`);

describe('maturity-map section', () => {
  it.each(['golden', 'ctx-msi', 'curve-logistic', 'industry-med'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<MaturityMap />);
    expect(missingNumbers(legacySectionText(fx, 'maturity-map')!, renderedText(container))).toEqual([]);
  });
  it('an adoption threshold edit lands in the document and moves the engine\'s L2 milestone, undo restores it', () => {
    render(<MaturityMap />);
    const before = l2Month();
    fireEvent.change(bound('Adoption', 2), { target: { value: '40' } });
    expect(doc().MATURITY_MAP.rampBounds).toEqual([0, 40, 55, 80]);
    expect(l2Month()).toBeGreaterThan(before);
    expect(screen.getByText('40–55%')).toBeTruthy();                        // adoption range column follows
    fireEvent.change(bound('Adoption', 2), { target: { value: '60' } });    // above L3 (55): L3 is pushed up, bounds stay non-decreasing
    expect(doc().MATURITY_MAP.rampBounds).toEqual([0, 60, 60, 80]);
    expect((bound('Adoption', 3) as HTMLInputElement).value).toBe('60');
    act(() => { appStore().undo(); });
    expect(doc().MATURITY_MAP.rampBounds).toEqual([0, 25, 55, 80]);
    expect(l2Month()).toBe(before);
  });
  it('values are rounded, clamped to 0-100, and a non-number is ignored', () => {
    render(<MaturityMap />);
    fireEvent.change(bound('Agent vFTE share', 3), { target: { value: '140' } });
    expect(doc().MATURITY_MAP.shareBounds).toEqual([0, 10, 100, 100]);
    fireEvent.change(bound('Agent vFTE share', 2), { target: { value: '7.6' } });
    expect(doc().MATURITY_MAP.shareBounds[1]).toBe(8);
    fireEvent.change(bound('Agent vFTE share', 2), { target: { value: '' } });
    expect(doc().MATURITY_MAP.shareBounds[1]).toBe(8);
  });
  it('the read-out follows: the lower of the two axes, capped by the context', () => {
    render(<MaturityMap />);
    const euros = computeCase(appStore().getState().doc).model.yearSav;
    expect(screen.getByText(/This case reaches/).textContent)
      .toMatch(/L4 — adoption axis L4 \(100% adoption\), agent-share axis L4 \(75% share\), engagement-context cap L4/);
    fireEvent.change(bound('Agent vFTE share', 4), { target: { value: '80' } });        // 75 % share no longer clears L4
    expect(screen.getByText(/This case reaches/).textContent).toMatch(/L3 — adoption axis L4.*agent-share axis L3/);
    expect(computeCase(appStore().getState().doc).model.yearSav).toEqual(euros);        // levels are read-outs: the euro result is untouched
  });
  it('labels are free text; reset restores the shipped ladder (and is one undo step)', () => {
    render(<MaturityMap />);
    fireEvent.change(screen.getByLabelText('Label of L1'), { target: { value: 'Beginner' } });
    fireEvent.change(bound('Adoption', 2), { target: { value: '40' } });
    expect(doc().MATURITY_MAP.labels[0]).toBe('Beginner');
    fireEvent.click(screen.getByText(/Reset to defaults/));
    expect(doc().MATURITY_MAP.rampBounds).toEqual([0, 25, 55, 80]);
    expect(doc().MATURITY_MAP.shareBounds).toEqual([0, 10, 25, 45]);
    expect(doc().MATURITY_MAP.labels[0]).toBe('L1 — Human assists');
    act(() => { appStore().undo(); });
    expect(doc().MATURITY_MAP.rampBounds[1]).toBe(40);
  });
});
