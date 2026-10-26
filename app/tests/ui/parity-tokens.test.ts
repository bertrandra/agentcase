import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import exceptions from '../../ui-parity-exceptions.json';
import { contrast } from '../../src/ui/colorText';
import { resolveCss } from '../helpers/themeCss';

/** The stylesheets read through the default theme (every `var(--ac-*)` resolved), lower-cased: the guards compare the computed legacy values. */
const css = (f: string): string => resolveCss(readFileSync(new URL(`../../src/ui/theme/${f}`, import.meta.url), 'utf8')).toLowerCase();
const shell = css('shell.css'), fonts = css('fonts.css');

/** Token-level guard of the shell chrome against the legacy v18.13 values; the computed-style comparison itself is `npm run ui-parity`. */
const rule = (selector: string): string => {
  const at = shell.search(new RegExp('^' + selector.replace(/[.:]/g, '\\$&') + ' \\{', 'm'));   // a rule that starts a line (not the shared selector lists)
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return shell.slice(at, shell.indexOf('}', at));
};

describe('shell chrome keeps the legacy values', () => {
  it('uses the legacy font stack with embedded Ubuntu 300/400/700', () => {
    expect(resolveCss('var(--ac-font)')).toBe("'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    for (const w of [300, 400, 700]) expect(fonts).toContain(`font-weight: ${w}`);
  });
  it('header banner: gradient, 30px/300 title', () => {
    for (const v of ['linear-gradient(135deg, #0058ab 0%, #121a38 100%)', 'padding: .75rem 2rem']) expect(rule('.ac-top')).toContain(v);
    expect(rule('.ac-brand')).toMatch(/font-size: 30px; font-weight: 300; letter-spacing: -\.01em/);
  });
  it('KPI bar: sticky blue gradient, 16px/700 values, 9.5px uppercase labels', () => {
    for (const v of ['position: sticky', 'z-index: 40', 'linear-gradient(135deg, #0058ab, #00488c)',
      'padding: .6rem 1.5rem']) expect(rule('.ac-kpis')).toContain(v);
    expect(shell).toMatch(/\.ac-kpi-v \{ font-size: 16px; font-weight: 700; \}/);
    expect(shell).toMatch(/\.ac-kpi-l \{ font-size: 9\.5px; text-transform: uppercase; letter-spacing: \.6px;/);
  });
  it('sidebar: 248px white card, group labels 10.5px/800, items 12.5px/600, hover and active colours', () => {
    expect(rule('.ac-nav')).toMatch(/width: 248px.*border-radius: 16px.*box-shadow: 0 2px 10px rgba\(18, 26, 56, \.08\)/s);
    expect(rule('.ac-nav-group')).toMatch(
      /font-size: 10\.5px; font-weight: 800; text-transform: uppercase; letter-spacing: \.8px.*color: #121a38; background: #eef1f7/);
    expect(rule('.ac-nav-group:hover')).toMatch(/background: #e0e7f5; color: #0058ab/);
    expect(rule('.ac-nav button')).toMatch(/font-size: 12\.5px; font-weight: 600; line-height: 1\.3/);
    expect(rule('.ac-nav button:hover')).toMatch(/background: #f0f4ff; color: #0058ab/);
    expect(shell).toMatch(/\.ac-nav button\.is-active \{ background: #0058ab; color: #fff; \}/);
  });
});

describe('recorded accessibility exceptions', () => {
  it('each pins a value that still reaches 4.5:1 on the legacy background', () => {
    expect(exceptions.exceptions.length).toBeGreaterThan(0);
    for (const e of exceptions.exceptions) {
      expect(e.reason.length).toBeGreaterThan(20);
      if (e.prop !== 'opacity') continue;
      const o = Number(e.expected), mix = (c: number, bg: number) => Math.round(c * o + bg * (1 - o)).toString(16).padStart(2, '0');
      expect(contrast('#' + [255, 255, 255].map((c, i) => mix(c, [0, 88, 171][i]!)).join(''), '#0058ab')).toBeGreaterThanOrEqual(4.5);
    }
  });
});
