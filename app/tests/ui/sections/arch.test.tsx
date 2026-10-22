// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ArchContent from '@/ui/sections/refshare/arch-content';
import ArchLayers from '@/ui/sections/refshare/arch-layers';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../../store/helpers';
import { expectParity } from '../../helpers/sectionParity';

beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('architecture sections', () => {
  it('arch-layers: every legacy figure and card heading is present (4 fixtures)', () => {
    expectParity('arch-layers', ArchLayers, { headings: ['Layer 2 · UI / Presentation', 'The seam — input bridge', 'Layer 1 · Calculation core', 'Time Engine', 'Layers 3-5 · Analytical stack', 'Cross-cutting engines', 'Single-source-of-truth registries', 'STATE_REGISTRY', 'VARIABLE_REGISTRY', 'SECTION_CATALOG'] });
  });
  it('arch-content: every legacy figure and heading is present (4 fixtures)', () => {
    expectParity('arch-content', ArchContent, { headings: ['Architecture — Layers content', 'Read this first — what\'s live vs. scaffolding'] });
  });
  it('the overview links to the detail chapter and back; the new-build mapping is shown', () => {
    const { unmount } = render(<ArchLayers />);
    fireEvent.click(screen.getByText('See full technical detail →'));
    expect(uiStore.getState().activeSection).toBe('arch-content');
    expect(screen.getByText('In the TypeScript build (v20)')).toBeTruthy();
    unmount();
    render(<ArchContent />);
    fireEvent.click(screen.getByText(/Back to Architecture/));
    expect(uiStore.getState().activeSection).toBe('arch-layers');
  });
});
