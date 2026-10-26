// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { fmtE, scenarioSet } from '@/domain/stress';
import { appStore } from '@/store/instance';
import Scenarios from '@/ui/sections/stress/scenarios';
import { loadExtra } from '../../helpers/extras';
import { numberTokens, renderedText } from '../../helpers/parity';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/stressParity';

afterEach(cleanup);
const set = () => scenarioSet(makeCtx(appStore().getState().doc));
const rowOf = (name: RegExp) => screen.getAllByRole('row').find((r) => name.test(r.textContent ?? ''))!;

/**
 * DEV-SCENARIO-ENGINE: the legacy flat-model figures of the setup, run cost, savings, net, ROI and payback columns (the AS-IS row and the baseline
 * are unchanged).
 */
const flatFigures = (fx: string): number[] => {
  const oracle =
    loadExtra('scenarioSet', fx) as { key: string; m: { setup: number; yearRun: number[]; totBen: number; roi: number | null; pbMonth: number | null } }[];
  return oracle.filter((s) => s.key !== 'asis')
    .flatMap(({ m }) => numberTokens([...m.yearRun, m.yearRun.reduce((a, b) => a + b, 0), m.setup, m.totBen, m.totBen - m.setup]
    .map(fmtE).concat(m.roi == null ? [] : [`${Math.round(m.roi * 100)}%`], m.pbMonth == null ? [] : [`${m.pbMonth} mo`]).join('  ')));
};

describe('scenarios section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed, but the flat-model ones (%s)', (fx) => {
    expect(missingFor(Scenarios, 'scenarios', fx, flatFigures(fx))).toEqual([]);
  });
  it('lists the six scenarios with the engine figures', () => {
    openFixture('golden');
    render(<Scenarios />);
    expect(set().map((s) => s.key)).toEqual(['asis', 'ai', 'loc', 'ramp', 'ailoc', 'aidst']);
    const ai = set().find((s) => s.key === 'ai')!;
    expect(rowOf(/^AI only/).textContent).toContain(fmtE(ai.m.totBen));
  });
  it('the destination drives the labels and the figures; undo restores them', () => {
    openFixture('golden');
    const { container } = render(<Scenarios />);
    const before = renderedText(container);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'India' } });
    expect(screen.getAllByText('AI + 100% India').length).toBeGreaterThan(0);
    expect(set().find((s) => s.key === 'aidst')!.m.tgtRateTJM).toBeLessThan(set().find((s) => s.key === 'asis')!.m.asisTJM);
    expect(renderedText(container)).not.toBe(before);
    act(() => { appStore().undo(); });
    expect(renderedText(container)).toBe(before);
  });
  it('the relocation ramp slider re-prices the Ramp scenario', () => {
    openFixture('scen-india-ramp50');
    render(<Scenarios />);
    expect(screen.getAllByText('Ramp to India (50%/yr)').length).toBeGreaterThan(0);
    const before = set().find((s) => s.key === 'ramp')!.m.totBen;
    fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } });
    expect(screen.getAllByText('Ramp to India (10%/yr)').length).toBeGreaterThan(0);
    expect(set().find((s) => s.key === 'ramp')!.m.totBen).not.toBe(before);
    expect(within(rowOf(/^Ramp to India/)).getAllByText(/€/).length).toBeGreaterThan(2);
  });
  it('a location-only move needs no setup: payback is immediate (no programme to pay back) and ROI is infinite', () => {
    openFixture('golden');
    render(<Scenarios />);
    expect(rowOf(/^Location only.*immediate/).textContent).toContain('∞ (no setup)');
  });
});
