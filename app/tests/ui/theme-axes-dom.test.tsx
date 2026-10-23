// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AXIS_DEFAULTS, axisAttr } from '@/domain/theme/axes';
import { applyThemeAxes, readThemeAxes, useThemeAxis } from '@/ui/themeAxes';

/**
 * The CSS side of the axes in a DOM: tokens.css + the generated axes.css loaded as stylesheets, a data attribute switched on <html> (or on a
 * preview container), the custom properties read back with getComputedStyle. jsdom cascades custom properties but does not substitute var(),
 * so `token()` follows the references itself, each on the element's own computed values (as the browser does).
 */
const css = (f: string) => readFileSync(join(process.cwd(), 'src/ui/theme', f), 'utf8');
let style: HTMLStyleElement;
beforeAll(() => { style = document.createElement('style'); style.textContent = css('tokens.css') + '\n' + css('axes.css'); document.head.appendChild(style); });
afterAll(() => style.remove());
afterEach(() => { applyThemeAxes({}); cleanup(); });

function token(name: string, el: Element = document.documentElement, depth = 0): string {
  const raw = getComputedStyle(el).getPropertyValue(`--ac-${name}`).trim();
  if (depth > 10) throw new Error(`loop at ${name}`);
  return raw.replace(/var\(--ac-([a-z0-9-]+)\)/g, (_, n: string) => token(n, el, depth + 1));
}

describe('theme axes in the DOM (generated CSS, data attributes)', () => {
  it('no attribute: the default look', () => {
    expect([token('pad-card'), token('radius'), token('radius-button'), token('box-border'), token('callout-rail'), token('font-size-base')]).toEqual(['1.25rem', '6px', '6px', '1px', '4px', '13px']);
  });
  it('each axis switches its tokens and the tokens built on them', () => {
    applyThemeAxes({ density: 'compact', radius: 'square', box: 'flat', callout: 'tint' });
    expect(document.documentElement.getAttribute('data-ac-density')).toBe('compact');
    expect([token('pad-card'), token('pad-table-cell'), token('space-block'), token('radius'), token('radius-button'), token('radius-card')]).toEqual(['.85rem', '4px 8px', '1rem', '0px', '0px', '0px']);
    expect([token('box-border'), token('box-bg'), token('callout-rail')]).toEqual(['0px', token('surface-muted'), '1px']);
    applyThemeAxes({ density: 'spacious', radius: 'round', buttons: 'pill', box: 'elevated', shadow: 'floating' });
    expect([token('pad-card'), token('font-size-figure'), token('radius'), token('radius-button'), token('shadow-box')]).toEqual(['1.75rem', '30px', '12px', '999px', token('shadow-lg')]);
    expect(document.documentElement.hasAttribute('data-ac-callout')).toBe(false);
  });
  it('typography: body, heading, numbers, scale, display weight', () => {
    applyThemeAxes({ fontBody: 'serif', fontHeading: 'system', fontNumeric: 'mono', typeScale: 'large', headingWeight: 'bold' });
    expect(token('font-body')).toMatch(/^Georgia/);
    expect(token('font')).toMatch(/^Georgia/);
    expect(token('font-heading')).toMatch(/^system-ui/);
    expect([token('numeric-figures'), token('font-size-base'), token('font-weight-display')]).toEqual(['tabular-nums', '14.5px', '700']);
    expect(token('font-numeric')).toMatch(/monospace$/);
  });
  it('the attribute also works on a sub-tree (a live preview): the tokens built on a changed one are declared again there', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    applyThemeAxes({ radius: 'square', fontBody: 'system' }, box);
    expect([token('radius', box), token('radius-button', box), token('radius', document.documentElement)]).toEqual(['0px', '0px', '6px']);
    expect(token('font', box)).toMatch(/^system-ui/);
    box.remove();
  });
  it('readThemeAxes reads the attributes back; an unknown value reads as the default', () => {
    applyThemeAxes({ density: 'compact', controlsBoolean: 'switch' });
    document.documentElement.setAttribute(axisAttr('radius'), 'hexagonal');
    expect(readThemeAxes()).toEqual({ ...AXIS_DEFAULTS, density: 'compact', controlsBoolean: 'switch' });
    applyThemeAxes(AXIS_DEFAULTS);
    expect([...document.documentElement.attributes].filter((a) => a.name.startsWith('data-ac-')).map((a) => a.name)).toEqual([]);
  });
  it('useThemeAxis re-renders when the attribute changes', async () => {
    function Probe() { return <output>{useThemeAxis('controlsNumeric')}</output>; }
    render(<Probe />);
    expect(screen.getByRole('status').textContent).toBe('auto');
    await act(async () => { applyThemeAxes({ controlsNumeric: 'stepper' }); await Promise.resolve(); });
    expect(screen.getByRole('status').textContent).toBe('stepper');
  });
});
