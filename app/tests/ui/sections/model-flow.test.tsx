// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase, makeCtx } from '@/domain';
import { flowModel } from '@/domain/model/flow';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/model-engine/flow';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
const doc = () => appStore().getState().doc;
const flow = () => flowModel(makeCtx(doc()));
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });

describe('model-flow section (P5 flow and value)', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'model-flow');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('the time-to-market value is hidden, not zero, until a margin is provided; then it is credited by the declared share only', () => {
    loadFixture('golden');
    const yearSav = computeCase(doc()).model.yearSav;
    render(<Section />);
    expect(screen.getByText(/hidden, not zero/)).toBeTruthy();
    expect(screen.queryByText('Flow NPV')).toBeNull();
    fireEvent.change(screen.getByLabelText('Margin per month (€, sponsor-owned)'), { target: { value: '80000' } });
    expect(doc().MODEL.FLOW).toMatchObject({ marginPerMonth: 80000 });
    expect(doc().MODEL.FLAGS.flow).toBe(true);
    expect(screen.getByText('Flow NPV')).toBeTruthy();
    expect(flow().flowNpv).toBe(0);   // 0 % throughput-in share: the freed capacity is already counted as cost-out
    fireEvent.change(screen.getByLabelText('Throughput-in share (%)'), { target: { value: '60' } });
    const npv = flow().flowNpv;
    expect(npv).toBeGreaterThan(0);
    expect(screen.getByText('Flow NPV').parentElement!.textContent).toContain(`€${Math.round(npv / 1000).toLocaleString('en-US')}K`);
    fireEvent.change(screen.getByLabelText('Discount rate (/yr)'), { target: { value: '0.2' } });
    expect(flow().flowNpv).toBeLessThan(npv);
    expect(computeCase(doc()).model.yearSav).toEqual(yearSav);   // additive: the financial case never moves
    fireEvent.click(screen.getByText('Reset / hide this valuation'));
    expect(screen.getByText(/hidden, not zero/)).toBeTruthy();
    expect(doc().MODEL.FLAGS.flow).toBe(false);
    undo();
    expect(screen.getByText('Flow NPV')).toBeTruthy();
  });
  it('a measured lead time overrides the derived one and measured WIP is shown beside Little\'s Law', () => {
    loadFixture('golden');
    render(<Section />);
    expect(flow().ctSource).toBe('derived');
    fireEvent.change(screen.getByLabelText('Measured lead time override (days, 0=use derived)'), { target: { value: '7' } });
    expect(flow()).toMatchObject({ ctSource: 'measured', ctNew: 7 });
    expect(screen.getByText('measured')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Measured WIP (items, optional)'), { target: { value: '4' } });
    expect(screen.getByText('measured: 4.0')).toBeTruthy();
    undo(2);
    expect(flow().ctSource).toBe('derived');
  });
  it('a binding supervision cap throttles the compression and says so', () => {
    loadFixture('me-flow-capped');
    render(<Section />);
    expect(flow().throttle).toBeLessThan(0.999);
    expect(screen.getByText(/Throttled to \d+% of the unconstrained compression/)).toBeTruthy();
  });
});
