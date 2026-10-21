// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LcWeighting from '@/ui/sections/scope/lc-weighting';
import { expectLikeFixture, loadFixture, SECTION_FIXTURES } from '../../helpers/scopeToolsFixtures';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);

describe('lc-weighting section', () => {
  it.each(SECTION_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const legacy = legacySectionText(fx, 'lc-weighting');
    expect(legacy).not.toBeNull();
    const { container } = render(<LcWeighting />);
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });

  it('jumping to a status moves the case exactly like the legacy fixture, and undo restores it', () => {
    const s = loadFixture('golden');
    render(<LcWeighting />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '75' } });
    expect(s.getState().doc.lifecyclePos).toBe(75);
    expectLikeFixture(s, 'lifecycle-pos-75');
    expect(screen.getByText(/Current status:/).textContent).toContain('Modernisation');
    act(() => { s.undo(); });
    expectLikeFixture(s, 'golden');
    expect(s.getState().doc.lifecyclePos).toBe(25);
  });

  it('the slider blends two statuses (37 → 52 % / 48 %) and the cascade follows the legacy weights', () => {
    const s = loadFixture('golden');
    const { container } = render(<LcWeighting />);
    fireEvent.change(screen.getByLabelText('Lifecycle position'), { target: { value: '37' } });
    expectLikeFixture(s, 'lifecycle-pos-37');
    expect(screen.getByText(/Current status:/).textContent).toContain('52% Feature add (active development) · 48% Maintenance (stabilised)');
    expect(renderedText(container)).toMatch(/×\s*0\.91/);       // V1 weight, legacy lcView extra: 0.908
    expect(renderedText(container)).toMatch(/×\s*1\.06/);       // blended posture
  });

  it('the switch turns the axis off (neutral weights, legacy fixture lifecycle-off) and back on', () => {
    const s = loadFixture('golden');
    const { container } = render(<LcWeighting />);
    fireEvent.click(screen.getByLabelText(/Apply product-status lifecycle weighting/));
    expect(s.getState().doc.lifecycleUse).toBe(false);
    expectLikeFixture(s, 'lifecycle-off');
    expect(renderedText(container)).toContain('Lifecycle weighting is off');
    act(() => { s.undo(); });
    expect(renderedText(container)).toContain('Resulting effort share');
    expectLikeFixture(s, 'golden');
  });
});
