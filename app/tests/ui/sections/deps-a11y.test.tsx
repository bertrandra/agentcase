// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Deps from '@/ui/sections/refshare/deps';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * axe-core on every tab of the generated dependency page, with and without a selected node (colour contrast needs a browser: tools/a11y.mjs covers it).
 * One audit per test: each takes 0.2 s (graph) to 1.1 s (matrix, ~2,900 cells) alone; the 15 s timeout is a safety margin for a loaded CI runner, not
 * the budget.
 */
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const audit = (c: HTMLElement): Promise<string[]> => axeViolations(c, { region: false });
const node = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('deps section accessibility', { timeout: 15_000 }, () => {
  it('the graph tab has no violation', async () => {
    const { container } = render(<Deps />);
    expect(await audit(container)).toEqual([]);
  });
  it('the graph tab has no violation with a section selected', async () => {
    const { container } = render(<Deps />);
    node(/^KPI Scorecard, section/);
    expect(await audit(container)).toEqual([]);
  });
  it('the graph tab has no violation with a zone selected', async () => {
    const { container } = render(<Deps />);
    node(/^KPI Scorecard, section/);
    node(/^Time Engine & annual model, calculation zone/);
    expect(await audit(container)).toEqual([]);
  });
  it.each(['▦ Dependency matrix', '📝 Zones & figures', '🌳 Build order', '🧪 Tests impacted'])('%s has no violation', async (name) => {
    const { container } = render(<Deps />);
    fireEvent.click(screen.getByRole('tab', { name }));
    expect(await audit(container)).toEqual([]);
  });
  it('every graph node has an accessible name and the svg is labelled', () => {
    const { container } = render(<Deps />);
    const nodes = [...container.querySelectorAll('g[role="button"]')];
    expect(nodes.length).toBeGreaterThan(50);
    expect(nodes.every((n) => (n.getAttribute('aria-label') ?? '').length > 3)).toBe(true);
    expect(container.querySelector('svg[role="group"]')?.getAttribute('aria-label')).toMatch(/Dependency graph/);
  });
});
