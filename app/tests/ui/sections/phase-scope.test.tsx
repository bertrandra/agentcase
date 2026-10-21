// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PhaseScope from '@/ui/sections/scope/phase-scope';
import { expectLikeFixture, loadFixture, modelOf, SECTION_FIXTURES } from '../../helpers/scopeToolsFixtures';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);

describe('phase-scope section', () => {
  it.each(SECTION_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const legacy = legacySectionText(fx, 'phase-scope');
    expect(legacy).not.toBeNull();
    const { container } = render(<PhaseScope />);
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });

  it('switching a phase on adds its artefacts: counts, ceiling and savings follow the legacy fixture scope-reduced; undo restores', () => {
    const s = loadFixture('golden');
    render(<PhaseScope />);
    const ceiling0 = modelOf(s).ceiling;
    expect(screen.getByText(/10\/53 art\./)).toBeTruthy();
    ['V1', 'V3', 'V6'].forEach((p) => fireEvent.click(screen.getByLabelText(`Phase ${p}`)));   // each phase fully on (V1 and V3 hold only some of their artefacts by default; V4 is already complete)
    expect(screen.getByText(/\d+\/53 art\./).textContent).toBe(`${s.getState().doc.selectedArtefacts.length}/53 art.`);
    expect(s.getState().doc.selectedArtefacts.length).toBeGreaterThan(10);
    expectLikeFixture(s, 'scope-reduced');
    expect(modelOf(s).ceiling).not.toBe(ceiling0);
    act(() => { for (let i = 0; i < 3; i++) s.undo(); });   // one step per phase
    expectLikeFixture(s, 'golden');
    expect(screen.getByText(/10\/53 art\./)).toBeTruthy();
  });

  it('every tile shows the phase effort share; shares of the in-scope phases add up to 100 %', () => {
    loadFixture('golden');
    const { container } = render(<PhaseScope />);
    const shares = [...container.querySelectorAll('.ac-tile-m span[title^="Effort share"]')].map((e) => parseFloat((e.textContent ?? '').replace('📊', '')));
    expect(shares).toHaveLength(12);
    expect(Math.abs(shares.reduce((a, b) => a + b, 0) - 100)).toBeLessThan(0.7);
  });

  it('Select all / Clear all drive the scope (Clear keeps the first phase) and the KPIs follow', () => {
    const s = loadFixture('golden');
    render(<PhaseScope />);
    fireEvent.click(screen.getByText('Select all'));
    expect(screen.getByText(/53\/53 art\./)).toBeTruthy();
    fireEvent.click(screen.getByText('Clear all'));
    expect(screen.getByText(/4\/53 art\./)).toBeTruthy();
    expect(screen.getByLabelText('Phase L0')).toHaveProperty('checked', true);
    expect(modelOf(s).scope.count).toBe(4);
  });
});
