// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import EngagementContext from '@/ui/sections/frame/engagement-context';
import { FIXTURES, loadFixture, parityGap } from './frameHelpers';

afterEach(cleanup);
const doc = () => appStore().getState().doc;
const calc = () => computeCase(doc());

describe('engagement-context section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (f) => {
    loadFixture(f);
    const { container } = render(<EngagementContext />);
    expect(parityGap(f, 'engagement-context', container)).toEqual([]);
  });
  it('the summary line equals the legacy ctxSummary, edited coefficient included', () => {
    for (const f of ['golden', 'frame-ctx-edit']) {
      loadFixture(f);
      const { container } = render(<EngagementContext />);
      const legacy = JSON.parse(readFileSync(`fixtures/extras/frameCtxSummary/${f}.json`, 'utf8')) as string;
      expect(container.textContent).toContain(legacy);
      cleanup();
    }
  });
  it('the context select writes the document, the model follows, undo restores', () => {
    loadFixture('golden');
    render(<EngagementContext />);
    const before = calc().model.eff;
    fireEvent.change(screen.getByLabelText('Engagement context'), { target: { value: 'STA' } });
    expect(doc().dom.values.engagementCtx).toBe('STA');
    expect(calc().model.eff).toBeLessThan(before);
    expect(screen.getByText('Staff augmentation (technical assistance)', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByText(/Maturity cap L2 · ramp ×0\.55 \(≤55%\)/)).toBeTruthy();
    act(() => { appStore().undo(); });
    expect(doc().dom.values.engagementCtx).toBe('MSC');
    expect(calc().model.eff).toBe(before);
  });
  it('the customer name is stored with the case (and coalesces into one step)', () => {
    loadFixture('golden');
    render(<EngagementContext />);
    const input = screen.getByLabelText('Customer name');
    fireEvent.change(input, { target: { value: 'Acm' } });
    fireEvent.change(input, { target: { value: 'Acme Corp' } });
    expect(doc().customerName).toBe('Acme Corp');
    expect(doc().dom.values.customerName).toBe('Acme Corp');
    expect(appStore().getState().history.undo.length).toBe(1);
  });
  it('the case discount rate drives the headline NPV (clamped to 0..1)', () => {
    loadFixture('golden');
    render(<EngagementContext />);
    const npv = calc().npv, input = screen.getByLabelText('Case discount rate (/yr)');
    fireEvent.change(input, { target: { value: '0.12' } });
    expect(doc().MODEL.CASE.discountRate).toBe(0.12);
    expect(calc().npv).toBeLessThan(npv);
    fireEvent.change(input, { target: { value: '5' } });
    expect(doc().MODEL.CASE.discountRate).toBe(1);
    act(() => { appStore().undo(); appStore().undo(); });
    expect(calc().npv).toBe(npv);
  });
  it('editing a coefficient moves the model for that context and is flagged as edited', () => {
    loadFixture('ctx-msi');
    render(<EngagementContext />);
    const before = calc().model.eff, cell = screen.getByLabelText('Glass factor × of MSI');
    fireEvent.change(cell, { target: { value: '0.5' } });
    expect(doc().engageCoef.MSI!.glassFactor).toBe(0.5);
    expect(calc().model.eff).toBeLessThan(before);
    expect(screen.getByLabelText('Glass factor × of MSI').classList.contains('is-edited')).toBe(true);
    act(() => { appStore().undo(); });
    expect(calc().model.eff).toBe(before);
  });
});
