// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { uiStore } from '@/ui/uiState';
import Home from '@/ui/sections/frame/home';
import { FIXTURES, loadFixture, parityGap } from './frameHelpers';

afterEach(cleanup);

describe('home section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (f) => {
    loadFixture(f);
    const { container } = render(<Home />);
    expect(parityGap(f, 'home', container)).toEqual([]);
  });
  it('one card per group of the persona, with its section count', () => {
    loadFixture('golden');
    render(<Home />);
    const cards = screen.getAllByRole('button').filter((b) => /^\d · /.test(b.textContent ?? '') || /^10 · /.test(b.textContent ?? ''));
    expect(cards.length).toBe(10);
    expect(screen.getByTitle('Opens 1 · Frame').textContent).toContain('4');
    expect(screen.getByText(/96 terms now inside AgentCase/)).toBeTruthy();
  });
  it('a card opens the first section of its group; the persona changes the counts', () => {
    const s = loadFixture('golden');
    render(<Home />);
    fireEvent.click(screen.getByTitle('Opens 3 · Scope'));
    expect(uiStore.getState().activeSection).toBe('phase-scope');
    cleanup();
    s.load({ ...s.getState().doc, currentPersona: 'advanced' });
    render(<Home />);
    expect(screen.getByTitle('Opens 4 · Tune').textContent).toContain('12');
    act(() => uiStore.setState({ activeSection: 'home' }));
  });
});
