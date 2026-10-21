// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Sources from '@/ui/sections/refshare/sources';
import { expectParity } from '../../helpers/sectionParity';

afterEach(cleanup);

describe('sources section', () => {
  it('shows every figure and heading the legacy section showed (4 fixtures)', () => {
    expectParity('sources', Sources, { headings: ['Sources & Data', '📦 Loaded reference', '📊 External benchmarks', '⚠️ To validate'] });
  });
  it('the help explains provenance in three tiers and can be toggled', () => {
    render(<Sources />);
    expect(screen.queryByText(/Provenance, stated honestly/)).toBeNull();
    fireEvent.click(screen.getByTitle('What does this section do?'));
    expect(screen.getByText(/Provenance, stated honestly/)).toBeTruthy();
  });
});
