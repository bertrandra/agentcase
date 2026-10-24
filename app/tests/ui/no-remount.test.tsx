// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ChartConfiguration } from 'chart.js';
import { useEffect, useMemo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateTheme } from '@/controllers/themes';
import { App } from '@/ui/App';
import { ThemeProvider } from '@/ui/brand/ThemeRuntime';
import { setDisplayPrefs } from '@/ui/display/store';
import { PREFS_DEFAULT } from '@/ui/display/prefs';
import { SECTION_COMPONENTS } from '@/ui/sections';
import { useTheme } from '@/ui/themeContext';
import { uiStore } from '@/ui/uiState';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { freshStore } from '../store/helpers';

/**
 * Lot 5a: a theme or display change re-renders what reads the theme; it never re-mounts the open section (docs/ARCHITECTURE.md §6, docs/THEME.md §7.2).
 * chart.js is replaced by a recorder: jsdom has no canvas, and the test inspects the config each chart instance holds.
 */
const charts = vi.hoisted(() => ({ made: [] as { config: ChartConfiguration; data: unknown; options: unknown; updates: string[]; destroyed: boolean }[] }));
vi.mock('chart.js', () => {
  class Chart {
    static defaults = { color: '#666', borderColor: 'rgba(0,0,0,0.1)' };
    static register(): void { /* nothing to register in the recorder */ }
    config: ChartConfiguration; data: unknown; options: unknown; updates: string[] = []; destroyed = false;
    constructor(_canvas: unknown, config: ChartConfiguration) { this.config = config; this.data = config.data; this.options = config.options; charts.made.push(this); }
    update(mode: string): void { this.updates.push(mode); }
    destroy(): void { this.destroyed = true; }
  }
  return { Chart, registerables: [] };
});

let mounts = 0;
const original = SECTION_COMPONENTS.glossary!;
beforeEach(() => {
  freshStore(); mounts = 0; charts.made.length = 0;
  // the real Glossary section, wrapped to count its mounts (an effect with no dependency runs once per mount)
  SECTION_COMPONENTS.glossary = async () => {
    const { default: Real } = await original();
    return { default: function Counted() { useEffect(() => { mounts++; }, []); return <Real />; } };
  };
  uiStore.setState({ activeSection: 'glossary', toast: '' });
});
afterEach(() => { cleanup(); act(() => setDisplayPrefs({ ...PREFS_DEFAULT })); act(() => activateTheme(1)); SECTION_COMPONENTS.glossary = original; });

describe('display and theme changes keep the open section mounted', () => {
  it('dark, contrast, colour-blind, reduced motion and another theme preset keep the selected tab, a draft and the scroll position', async () => {
    render(<App />);
    const search = await screen.findByRole('searchbox', { name: 'Search a term or definition' });
    fireEvent.change(search, { target: { value: 'agent' } });   // a draft: local state of the section, never in the case
    const tab = screen.getAllByRole('tab')[2]!;
    fireEvent.click(tab);
    const main = screen.getByRole('main');
    main.scrollTop = 240;
    const cell = main.querySelector('tbody td')!, colour = (cell as HTMLElement).style.color;
    expect(mounts).toBe(1);
    const steps: [string, () => void][] = [
      ['dark', () => setDisplayPrefs({ mode: 'dark' })], ['high contrast', () => setDisplayPrefs({ contrast: 'high' })],
      ['colour-blind', () => setDisplayPrefs({ cvd: true })], ['reduced motion', () => setDisplayPrefs({ reduceMotion: true })],
      ['theme preset', () => activateTheme(7)], ['back to light', () => setDisplayPrefs({ ...PREFS_DEFAULT })],
    ];
    for (const [what, step] of steps) {
      act(step);
      expect(mounts, what).toBe(1);
      expect(screen.getByRole('main'), what).toBe(main);
      expect(main.scrollTop, what).toBe(240);
      expect((screen.getByRole('searchbox', { name: 'Search a term or definition' }) as HTMLInputElement).value, what).toBe('agent');
      expect(screen.getAllByRole('tab')[2]!.getAttribute('aria-selected'), what).toBe('true');
      expect(main.querySelector('tbody td'), what).toBe(cell);   // the same DOM node: re-rendered, not re-created
    }
    act(() => setDisplayPrefs({ mode: 'dark' }));
    expect((cell as HTMLElement).style.color).not.toBe(colour);   // the data-colour text was recomputed for the dark surface, in place
  });
});

/** A chart whose colours come from the theme in effect, like every section chart. */
function ThemedChart() {
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({ type: 'bar', data: { labels: ['a', 'b'], datasets: [{ label: 'S', data: [1, 2], backgroundColor: tok('chart-cat-1') }] } }), [tok]);
  return <ChartPanel config={config} label="Themed" />;
}
const colourOf = (c: (typeof charts.made)[number]) => ((c.data as ChartConfiguration['data']).datasets[0] as { backgroundColor: string }).backgroundColor;

describe('charts follow the theme in place', () => {
  it('a display or theme change updates the same chart instance (update("none")) with the new colours', async () => {
    render(<ThemeProvider><ThemedChart /></ThemeProvider>);
    await waitFor(() => expect(charts.made).toHaveLength(1));
    const chart = charts.made[0]!, light = colourOf(chart);
    expect(light).toBe('#0058ab');
    act(() => setDisplayPrefs({ mode: 'dark' }));
    expect(charts.made).toHaveLength(1);
    expect(chart.destroyed).toBe(false);
    expect(chart.updates).toEqual(['none']);
    expect(colourOf(chart)).not.toBe(light);
    act(() => setDisplayPrefs({ cvd: true, reduceMotion: true }));
    expect((chart.options as { animation?: unknown }).animation).toBe(false);
    act(() => setDisplayPrefs({ ...PREFS_DEFAULT }));
    act(() => activateTheme(7));
    expect(charts.made).toHaveLength(1);
    expect(colourOf(chart)).toBe('#5b2a9e');   // Purple's primary series
  });
  it('a new config from an edit still rebuilds the chart (unchanged behaviour)', async () => {
    const cfg = (n: number): ChartConfiguration => ({ type: 'bar', data: { labels: ['a'], datasets: [{ label: 'S', data: [n] }] } });
    const { rerender } = render(<ChartPanel config={cfg(1)} label="Edit" />);
    rerender(<ChartPanel config={cfg(2)} label="Edit" />);
    expect(charts.made).toHaveLength(2);
    expect(charts.made[0]!.destroyed).toBe(true);
  });
});
