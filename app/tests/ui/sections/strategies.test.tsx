// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { evaluateStrategies, stratNormalize, strategyDefsOf, stratWeightsOf } from '@/domain/verdict';
import { appStore } from '@/store/instance';
import { uiStore } from '@/ui/uiState';
import Strategies from '@/ui/sections/verdict/strategies';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/sectionParity';

afterEach(cleanup);
const ctx = () => makeCtx(appStore().getState().doc);
const rows = () => evaluateStrategies(ctx());
const rank = () => { const c = ctx(); return stratNormalize(rows(), stratWeightsOf(c.s)); };
const metricRow = (label: RegExp) => screen.getAllByRole('row').find((r) => label.test(r.children[0]?.textContent ?? ''))!;

describe('strategies section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    expect(missingFor(Strategies, 'strategies', fx)).toEqual([]);
  });
  it('the metric table is the engine output, best in green and worst in red', () => {
    openFixture('golden');
    render(<Strategies />);
    const roi = metricRow(/^ROI/), r = rows();
    expect(roi.children[5]!.textContent).toBe(`${Math.round((r[4]!.computed.roi as number) * 100)}%`);   // Agentic Organization = 713 %
    expect(roi.children[5]!.textContent).toBe('713%');
    expect(roi.querySelectorAll('[data-rank="best"]')).toHaveLength(1);
    expect(roi.querySelector('[data-rank="worst"]')!.textContent).toBe('-130%');
    expect(metricRow(/^Operational Risk/).textContent).toContain('●●●●○');
  });
  it('the ranking puts the winner first; weights re-rank, reset restores, undo works', () => {
    openFixture('golden');
    render(<Strategies />);
    expect(rank()[0]!.id).toBe('agentic');
    const roiW = screen.getByText('ROI', { selector: '.ac-field-l' }).closest('label')!.querySelector('input')!;
    fireEvent.change(roiW, { target: { value: '0' } });
    fireEvent.change(screen.getByText('TCO', { selector: '.ac-field-l' }).closest('label')!.querySelector('input')!, { target: { value: '100' } });
    expect(stratWeightsOf(ctx().s).tco).toBe(100);
    expect(roiW.style.borderColor).toContain('amber');
    fireEvent.click(screen.getByText('↺ Reset weights'));
    expect(stratWeightsOf(ctx().s)).toEqual({ roi: 20, tco: 15, payback: 10, aiCoverage: 15, humanSup: 10, risk: 15, agility: 15 });
    act(() => { appStore().undo(); });
    expect(stratWeightsOf(ctx().s).tco).toBe(100);
  });
  it('a lever edit changes that strategy only; reset all restores the defaults', () => {
    openFixture('golden');
    render(<Strategies />);
    const before = rows();
    fireEvent.change(screen.getByLabelText('auto of Hybrid'), { target: { value: '60' } });
    const after = rows();
    expect(after.find((r) => r.id === 'hybrid')!.computed.aiCoverage).not.toBe(before.find((r) => r.id === 'hybrid')!.computed.aiCoverage);
    expect(after.find((r) => r.id === 'offshore')).toEqual(before.find((r) => r.id === 'offshore'));
    expect((screen.getByLabelText('auto of Hybrid') as HTMLInputElement).style.borderColor).toContain('amber');
    fireEvent.click(screen.getByText('↺ Reset all strategies'));
    expect(rows()).toEqual(before);
  });
  it('the geo split of a custom strategy must total 100 %: Σ turns red when it does not', () => {
    openFixture('golden');
    render(<Strategies />);
    fireEvent.change(screen.getByLabelText('Location split of T&M'), { target: { value: 'custom' } });
    expect(screen.getAllByText(/^Σ 100%$/).length).toBeGreaterThanOrEqual(4);
    const france = screen.getByLabelText('France share of Service center') as HTMLInputElement;
    fireEvent.change(france, { target: { value: '70' } });
    const sigma = within(france.closest('td')!).getByText(/^Σ /);
    expect(sigma.textContent).toBe('Σ 120%');
    expect(sigma.style.color).toContain('brick');
  });
  it('→ Apply pushes the levers into the case, opens Results and is one undoable step', () => {
    const s = openFixture('golden');
    render(<Strategies />);
    const row = screen.getAllByRole('row').find((r) => /Hybrid/.test(r.textContent ?? '') && within(r).queryByText('→ Apply'))!;
    fireEvent.click(within(row).getByText('→ Apply'));
    expect(s.getState().doc.dom.values.autoPotential).toBe('40');
    expect(s.getState().doc.dom.checked.fitAuto).toBe(false);
    expect(uiStore.getState().activeSection).toBe('results');
    expect(s.getState().history.undo).toHaveLength(1);
    act(() => { s.undo(); });
    expect(s.getState().doc.dom.values.autoPotential).toBe('75');
    expect(strategyDefsOf(ctx().s)).toHaveLength(7);
  });
});
