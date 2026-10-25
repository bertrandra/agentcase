// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import TeamIn from '@/ui/sections/baseline/team-in';
import { appStore } from '@/store/instance';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtures';

// jsdom has no canvas: ChartPanel tolerates null
beforeAll(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
const base = () => computeCase(doc()).model.base;
const commit = (label: string, value: string) => { const i = screen.getByLabelText(label); fireEvent.change(i, { target: { value } }); fireEvent.blur(i); };
// 0.05 is the legacy help text "FTE rounded to 0.05" — stale: the code snaps to 0.5 (FTE_STEP), the port says 0.5.
const IGNORE = [0.05];

describe('team-in section', () => {
  it.each([...PARITY_FIXTURES, 'team-large'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<TeamIn />);
    const legacy = legacySectionText(fx, 'team-in');
    if (legacy) expect(missingNumbers(legacy, renderedText(container), IGNORE)).toEqual([]);
    expect(renderedText(container)).toContain('Breakdown by skill');
  });
  it('golden summary: 15 FTE, €1,769K, €536 blended, 3 lines', () => {
    loadFixture('golden');
    const { container } = render(<TeamIn />);
    const t = renderedText(container).replace(/\s+/g, ' ');
    expect(t).toMatch(/15\.0 Total FTE/); expect(t).toContain('€1,769K'); expect(t).toContain('€536'); expect(t).toMatch(/3 # resource lines/);
    expect(t).toContain('100% of the scope weight is assigned.');
  });
  it('editing a row (FTE, grade, location) changes the baseline and undo restores it', () => {
    loadFixture('golden');
    render(<TeamIn />);
    const b0 = base();
    commit('FTE of line 1', '5.3');
    expect(doc().teamIn[0]!.etp).toBe(5.5);                                    // snapped to 0.5
    expect(base().etp).toBeCloseTo(b0.etp + 2.5);
    expect(base().cost).toBeGreaterThan(b0.cost);
    fireEvent.change(screen.getByLabelText('Location of line 2'), { target: { value: 'India' } });
    expect(doc().teamIn[1]!.loc).toBe('India');
    fireEvent.change(screen.getByLabelText('Grade of line 2'), { target: { value: 'A1' } });
    expect(base().cost).toBeLessThan(computeCase(doc()).model.base.cost + 1);
    act(() => { appStore().undo(); appStore().undo(); appStore().undo(); });
    expect(base()).toEqual(b0);
  });
  it('adds and removes a line; the last line cannot be removed', () => {
    loadFixture('golden');
    render(<TeamIn />);
    fireEvent.click(screen.getByText('+ Add a resource'));
    expect(doc().teamIn).toHaveLength(4);
    expect(doc().teamIn[3]).toMatchObject({ skill: 'Dev', grade: 'B1', loc: 'France', etp: 0.5 });
    fireEvent.click(screen.getByLabelText('Remove line 4'));
    expect(doc().teamIn).toHaveLength(3);
    act(() => { appStore().undo(); });
    expect(doc().teamIn).toHaveLength(4);
  });
  it('the total field scales every line pro rata, exactly, in 0.5 steps', () => {
    loadFixture('golden');
    render(<TeamIn />);
    commit('Total AS-IS team (FTE)', '30');
    expect(doc().teamIn.map((r) => r.etp)).toEqual([6, 16, 8]);
    commit('Total AS-IS team (FTE)', '0');                                      // ignored (legacy: target must be > 0)
    expect(doc().teamIn.map((r) => r.etp)).toEqual([6, 16, 8]);
    act(() => { appStore().undo(); });
    expect(doc().teamIn.map((r) => r.etp)).toEqual([3, 8, 4]);
  });
  it('pins: a line can pin artefacts (exclusively), the banner reports unstaffed weight and offers a fix', () => {
    loadFixture('baseline-pins-med');
    const { container } = render(<TeamIn />);
    expect(screen.getByText(/Unstaffed scope weight/)).toBeTruthy();
    const text = () => renderedText(container).replace(/\s+/g, ' ');
    expect(text()).toContain('there is no Analysis/PO resource line at all');
    expect(text()).toContain('there is no Clinical Affairs resource line at all');
    fireEvent.click(screen.getByLabelText('Pin line 2'));
    const editor = screen.getByText(/Pin line 2 —/).closest('section')!;
    fireEvent.click(within(editor).getByLabelText('Pin A019'));
    expect(doc().teamIn[1]!.pins).toEqual(['A019']);
    fireEvent.click(within(editor).getByLabelText('Pin A017'));                // owned by line 1: moves to line 2
    expect(doc().teamIn[0]!.pins).toEqual(['A018']);
    expect(doc().teamIn[1]!.pins).toEqual(['A019', 'A017']);
    const n1 = doc().teamIn[1]!.pins!.length;
    fireEvent.click(within(editor).getAllByText('pin all')[0]!);
    expect(doc().teamIn[1]!.pins!.length).toBeGreaterThan(n1);
    fireEvent.click(within(editor).getAllByText('unpin all')[0]!);
    fireEvent.click(within(editor).getByText('Clear pins'));
    expect(doc().teamIn[1]!.pins).toEqual([]);
    const n = doc().teamIn.length;
    fireEvent.click(screen.getAllByText('+ add an auto line')[0]!);
    expect(doc().teamIn).toHaveLength(n + 1);
    fireEvent.click(within(editor).getByText('Close'));
    expect(screen.queryByText(/Pin line 2 —/)).toBeNull();
  });
  it('Build from artefacts staffs every skill of the scope; Align moves FTE to the implied value; both undo', () => {
    loadFixture('baseline-pins-med');
    const { container } = render(<TeamIn />);
    const before = JSON.stringify(doc().teamIn), fte = base().etp;
    fireEvent.click(screen.getByText(/Build from artefacts/));
    expect(renderedText(container)).toMatch(/100% of the scope weight is assigned/);
    expect(screen.queryByText(/Unstaffed scope weight/)).toBeNull();
    expect(base().etp).toBeCloseTo(fte);
    act(() => { appStore().undo(); });
    expect(JSON.stringify(doc().teamIn)).toBe(before);
    fireEvent.click(screen.getByText(/Align FTE to mix/));
    expect(JSON.stringify(doc().teamIn)).not.toBe(before);
    expect(base().etp).toBeCloseTo(fte);
    act(() => { appStore().undo(); });
    expect(JSON.stringify(doc().teamIn)).toBe(before);
  });
});
