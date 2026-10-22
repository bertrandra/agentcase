// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Deps from '@/ui/sections/refshare/deps';
import { freshStore } from '../../store/helpers';

/** axe-core on every tab of the generated dependency page, with and without a selected node (colour contrast needs a browser: tools/a11y.mjs covers it). */
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const audit = async (c: HTMLElement): Promise<string[]> => {
  const r = await axe.run(c, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.html.slice(0, 120)}`);
};

describe('deps section accessibility', () => {
  it('the graph tab has no violation, also with a node selected', async () => {
    const { container } = render(<Deps />);
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /^KPI Scorecard, section/ }));
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /^Time Engine & annual model, calculation zone/ }));
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
