// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setChecked, setInput } from '@/controllers/inputs';
import { setSeq } from '@/controllers/scope';
import { appStore } from '@/store/instance';
import Gantt from '@/ui/sections/verify/gantt';
import { extra, statsOf } from '../../helpers/economics';
import { loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);

interface LRow { label: string; bars: string[][] }
interface Cap { summary: string[][]; ticks: string[][]; prog: LRow[]; phases: LRow[] }
const rowsOf = (c: Element) => [...c.querySelectorAll('[data-gantt-row]')].map((r) => ({
  label: r.children[0]!.textContent!.trim(), bars: [...r.children[1]!.querySelectorAll('div')].map((d) => [d.style.left, d.style.width]),
}));
const near = (a: string | undefined, b: string | undefined) => Math.abs(parseFloat(a ?? 'x') - parseFloat(b ?? 'y')) <= 0.0051;
const sameRows = (got: LRow[], exp: LRow[]) => {
  expect(got.map((r) => r.label)).toEqual(exp.map((r) => r.label));
  got.forEach((r, i) => r.bars.forEach((b, k) => expect([i, near(b[0], exp[i]!.bars[k]![0]), near(b[1], exp[i]!.bars[k]![1])]).toEqual([i, true, true])));
};

describe('gantt section', () => {
  it.each(PARITY_FIXTURES)('shows every figure and date the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Gantt />);
    expect(parityGaps(id, 'gantt', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy summary, calendar ticks and every bar (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Gantt />), L = extra<{ collapsed: Cap }>('vb_gantt', id).collapsed;
    expect(statsOf(container).map((s) => [s[0], s[1]])).toEqual(L.summary.map(([l, v]) => [l!, v!]));
    sameRows(rowsOf(container), [...L.prog, ...L.phases]);
    const ticks = container.querySelectorAll('.ac-gantt-tick-l');
    expect([...ticks].map((t) => t.textContent)).toEqual(L.ticks.map((t) => t[1]));
  });
  it.each(['golden', 'vb-seq', 'cross-cutting'])('expanding every phase reproduces the legacy artefact rows (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Gantt />), L = extra<{ expanded: Cap }>('vb_gantt', id).expanded;
    screen.getAllByRole('button', { name: /^Expand / }).forEach((b) => fireEvent.click(b));
    sameRows(rowsOf(container), [...L.prog, ...L.phases]);
  });
  it('shows the release marker and the engine-derived milestones with their dates', () => {
    const { container } = render(<Gantt />);
    expect(container.textContent).toContain('🏁 full cycle complete');
    expect(container.textContent).toMatch(/First agent vFTE\s*Oct 26/);
    expect(container.textContent).toContain('Payback (break-even)');
  });
  it('the roadmap durations and the onboarding toggle reshape the program; undo restores it', () => {
    const { container } = render(<Gantt />), summary = () => Object.fromEntries(statsOf(container));
    const n = () => container.querySelectorAll('[data-gantt-row]').length;
    const rows0 = n();
    act(() => setInput('rmD1', 10));
    expect(summary()['Onboarding']).toBe('24 wk');
    act(() => setChecked('ganttShowOnboarding', false));
    expect([n(), rows0 - n()]).toEqual([rows0 - 4, 4]);
    act(() => setInput('rmStart', '2027-01-15'));
    expect(summary()['Start']).toBe('1/15/2027');
    expect(container.textContent).toContain('Jan 27');
    act(() => { appStore().undo(); appStore().undo(); appStore().undo(); });
    expect([n(), summary()['Onboarding'], summary()['Start']]).toEqual([rows0, '18 wk', '9/1/2026']);
  });
  it('the phase overlap input and a phase ramp-up sequence move the delivery bars', () => {
    const { container } = render(<Gantt />), bars = () => JSON.stringify(rowsOf(container).slice(-3));
    const before = bars();
    fireEvent.change(screen.getByLabelText(/Phase overlap/), { target: { value: '20' } });
    expect(bars()).not.toBe(before);
    act(() => setSeq('phase', 'V4', 1));
    expect(rowsOf(container).slice(-3)[0]!.label).toContain('V4 · Verification');
    act(() => { appStore().undo(); appStore().undo(); });
    expect(bars()).toBe(before);
  });
  it('the horizon sets the length of the calendar', () => {
    const { container } = render(<Gantt />);
    act(() => setInput('horizon', 5));
    expect(statsOf(container).find((s) => s[0] === 'Horizon')![1]).toBe('5 yr');
    expect(container.textContent).toContain('Sep 31');
  });
});
