// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArchContent from '@/ui/sections/refshare/arch-content';
import ArchLayers from '@/ui/sections/refshare/arch-layers';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../../store/helpers';

// DEV-ARCH-CONTENT: replaces the legacy-oracle parity (expectParity: figures and headings of the legacy text) with checks of the REWRITTEN content.
beforeEach(() => { freshStore(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const headings = (): { level: number; text: string }[] => [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => ({ level: Number(h.tagName[1]), text: h.textContent ?? '' }));
const inOrder = (all: string[], wanted: string[]): boolean => { let i = 0; for (const t of all) if (i < wanted.length && t.includes(wanted[i] as string)) i++; return i === wanted.length; };

describe.each([
  ['arch-layers', ArchLayers, ['Layer 4 · ui', 'Layer 3 · controllers', 'Layer 2 · store', 'Layer 1 · domain', 'Rules enforced', 'Time Engine', 'Command bus', 'Portfolio layer', 'Persistence', 'View selector', 'Proof layer', 'Single-source-of-truth registries', 'Legacy engines']],
  ['arch-content', ArchContent, ['Layers and the rules enforced by ESLint', 'Domain: the calculation engine', 'Time Engine', 'Store and the command bus',
    'Data flow of one user action', 'Portfolio layer', 'View selector', 'Persistence, exports', 'Security properties', 'Performance budgets', 'Proof layer',
    'Single-source-of-truth registries', 'Versioning and release', 'Known gaps', 'What changed since the legacy app']],
] as const)('%s', (id, Section, order) => {
  it('renders without console error, with one h1 and headings that never skip a level', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Section />);
    const hs = headings();
    expect(hs.filter((h) => h.level === 1)).toHaveLength(1);
    expect(hs[0]?.level).toBe(1);
    hs.slice(1).forEach((h, i) => expect(h.level - (hs[i]?.level ?? 0), `${id}: ${h.text}`).toBeLessThanOrEqual(1));
    expect(err).not.toHaveBeenCalled();
  });
  it('shows its headings in order', () => {
    render(<Section />);
    expect(inOrder(headings().map((h) => h.text), [...order])).toBe(true);
  });
  it('no longer carries the legacy vocabulary as live status (wiring status, migration plan, scaffolding)', () => {
    const { container } = render(<Section />);
    expect(container.textContent).not.toMatch(/scaffolding|wiring status|migration plan|readInputs|refreshAll|FULL_REFRESH/i);
  });
});

describe('architecture sections: navigation', () => {
  it('the overview links to the detail chapter and back', () => {
    const { unmount } = render(<ArchLayers />);
    fireEvent.click(screen.getByText('See full technical detail →'));
    expect(uiStore.getState().activeSection).toBe('arch-content');
    unmount();
    render(<ArchContent />);
    fireEvent.click(screen.getAllByText(/Back to Architecture/)[0] as HTMLElement);
    expect(uiStore.getState().activeSection).toBe('arch-layers');
  });
  it('the legacy-to-today table maps the six engines', () => {
    render(<ArchLayers />);
    for (const e of ['BUS', 'APP_STATE', 'PM', 'DEP', 'AUDIT', 'TIME']) expect(screen.getAllByText(e).length).toBeGreaterThan(0);
  });
});
