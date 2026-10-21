// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { setQualityAsis } from '@/controllers/verifyB';
import { appStore } from '@/store/instance';
import Kpi from '@/ui/sections/verify/kpi';
import { statsOf } from '../../helpers/economics';
import { bodies, legacyDom, loadFixture, PARITY_FIXTURES, parityGaps, VB_FIXTURES } from '../../helpers/verifyB';
import { freshStore } from '../../store/helpers';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../../helpers/chartStub'));   // jsdom has no canvas
beforeEach(() => { freshStore(); });
afterEach(cleanup);

const cards = (root: Element) => statsOf(root);
describe('kpi section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Kpi />);
    expect(parityGaps(id, 'kpi', container)).toEqual([]);
  });
  it.each(VB_FIXTURES)('reproduces the legacy cards and the three KPI tables cell by cell (%s)', (id) => {
    loadFixture(id);
    const { container } = render(<Kpi />), L = legacyDom(id);
    expect(bodies(container)).toEqual([L.kpiEco, L.kpiVq, L.kpiComp].map((t) => t.slice(1)));
    expect(cards(container).map((s) => s[0]).sort()).toEqual(L.kpiCards.map((c) => c[0]!).sort());
    expect(container.textContent).toContain(L.kpiCards[0]![1]);
  });
  it('the index chart has AS-IS and TO-BE series over seven indicators', () => {
    const { container } = render(<Kpi />), c = container.querySelector('canvas')!;
    expect([c.dataset.points, c.dataset.series]).toEqual(['7', 'AS-IS (100):7,TO-BE Y3:7']);
  });
  it('an economic input edit moves the run cost KPI and a quality edit moves the quality KPI; undo restores', () => {
    const { container } = render(<Kpi />), run = () => bodies(container)[0]![1]![2], bugs = () => bodies(container)[1]![2]![1];
    const [run0, bugs0] = [run(), bugs()];
    act(() => setInput('tokensPerArt', 400000));
    expect(run()).not.toBe(run0);
    act(() => setQualityAsis(0, 3.5));
    expect(bugs()).toBe('3.5');
    act(() => { appStore().undo(); appStore().undo(); });
    expect([run(), bugs()]).toEqual([run0, bugs0]);
  });
});
