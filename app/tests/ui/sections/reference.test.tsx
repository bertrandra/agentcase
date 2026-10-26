// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Reference from '@/ui/sections/refshare/reference';
import { uiStore } from '@/ui/uiState';
import { expectParity } from '../../helpers/sectionParity';

afterEach(cleanup);

describe('reference section', () => {
  it('shows every figure and heading the legacy section showed (4 fixtures)', () => {
    expectParity('reference', Reference,
      { headings: ['Reference Map', 'Reference subchapter', 'Summary', 'Coverage', '1.1 Vision, ambition & maturity scale', '6.3 Performance measurement'] });
  });
  it('tallies the coverage statuses and links each row to its section', () => {
    render(<Reference />);
    expect(screen.getAllByText(/^(✅ Covered)$/)).toHaveLength(14);
    expect(screen.getAllByText(/Partial/).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByText('Eligibility & Abaques →', { selector: 'tr:nth-child(2) button' }));
    expect(uiStore.getState().activeSection).toBe('eligibility');
  });
});
