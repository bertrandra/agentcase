import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveCss } from '../helpers/themeCss';

/**
 * Token-level guard of the SECTION CONTENT styles against the frozen legacy file: each pair names a legacy rule and the rule of content.css / a11y.css
 * that must carry the same declarations. The computed-style comparison of all 79 sections is `npm run ui-parity`; this catches a drifting token in milliseconds.
 */
const read = (u: string): string => readFileSync(new URL(u, import.meta.url), 'utf8');
const theme = (f: string): string => resolveCss(read(`../../src/ui/theme/${f}`));   // tokens resolved to their default-theme values
const legacy = [...read('../../../AgentCase_v18_13_EN.html').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const content = theme('content.css'), a11y = theme('a11y.css'), tokens = theme('tokens.css'), shell = theme('shell.css');

const flat = (v: string): string => v.replace(/\s+/g, '').replace(/\.(\d)/g, '0.$1').replace(/(\d)0+(?=px|rem|em|%|s\b)/g, '$1').toLowerCase().replace(/0\.(\d)/g, '.$1');
/** The declarations of the first rule whose selector is exactly `selector` (whitespace-insensitive). */
function decls(css: string, selector: string): Map<string, string> {
  const want = flat(selector);
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if (!m[1]!.split(/,(?![^(]*\))/).some((s) => flat(s) === want) && flat(m[1]!) !== want) continue;
    return new Map(m[2]!.split(';').map((d) => d.split(/:(.*)/s)).filter((p) => p[1] !== undefined).map((p) => [p[0]!.trim(), flat(p[1]!)]));
  }
  return new Map();
}
/** `legacy` rule and `current` rule agree on every property in `props` (the same names in both). */
function same(legacySel: string, current: string, props: string[], css = content): void {
  const [l, n] = [decls(legacy, legacySel), decls(css, current)];
  expect(l.size, `legacy ${legacySel}`).toBeGreaterThan(0);
  expect(n.size, `current ${current}`).toBeGreaterThan(0);
  for (const p of props) expect(n.get(p), `${current} ${p} (legacy ${legacySel})`).toBe(l.get(p));
}

describe('section content keeps the legacy values', () => {
  it('base: ink, background, line-height; the section is the legacy white 16px card', () => {
    expect(resolveCss('var(--ac-ink)')).toBe('#333'); expect(resolveCss('var(--ac-bg)')).toBe('#f5f6fa');
    expect(tokens).toContain("font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;");
    same('.tab-content', '.ac-section', ['padding', 'background', 'border-radius', 'box-shadow']);
    expect(content).toContain(':where(.ac-section, .ac-section *) { margin: 0; padding: 0; box-sizing: border-box; }');
  });
  it('title and help button', () => {
    same('h2', '.ac-section h1', ['font-size', 'font-weight', 'color']);
    same('.sec-help-btn', '.ac-section .ac-help-btn', ['width', 'height', 'border', 'border-radius', 'background', 'color', 'font-size', 'font-weight', 'line-height', 'cursor']);
    same('.sec-help-panel', '.ac-section .ac-help', ['padding', 'background', 'border', 'border-left', 'border-radius']);
  });
  it('headings keep the legacy scale whatever the outline level (h3 -> h2, h4 -> h3)', () => {
    same('h3', ':where(.ac-work) h2', ['font-size', 'font-weight', 'color', 'margin'], a11y);
    same('h4', ':where(.ac-work) h3', ['font-size', 'font-weight', 'color', 'margin'], a11y);
    same('.explainer h3', '.ac-section .ac-rich :is(h2, h3)', ['font-size', 'font-weight', 'color']);
    same('.explainer p', '.ac-section :is(.ac-help, .ac-rich) p', ['font-size', 'line-height', 'color']);
  });
  it('notes: insight box, note-green, note-blue, formula, worked example, card', () => {
    const geometry = ['padding', 'background', 'border', 'border-left', 'border-radius', 'font-size', 'line-height', 'color'];
    same('.insight-box', '.ac-section :is(.ac-zone > p.ac-muted:first-child, .ac-callout, .ac-rich-insight-box)', geometry);
    same('.note-green', '.ac-section :is(.ac-callout-green, .ac-rich-note-green)', geometry);
    same('.note-blue', '.ac-section :is(.ac-callout-blue, .ac-rich-note-blue)', geometry);
    same('.formula', '.ac-rich-formula', ['padding', 'background', 'color', 'border-radius']);
    same('.worked', '.ac-rich-worked', ['padding', 'background', 'border', 'border-radius']);
    same('.card', '.ac-section .ac-rich-card', ['padding', 'background', 'border', 'border-radius']);
    same('.card', '.ac-section .ac-card', ['padding', 'background', 'border', 'border-radius']);
  });
  it('tabs, summary band, chart wrapper, legend', () => {
    same('.pm-subtabs', '.ac-section .ac-tabs', ['gap', 'margin', 'border-bottom']);
    same('.pm-subtab-btn', '.ac-section .ac-tabs button', ['padding', 'font-size', 'font-weight', 'color', 'border-radius', 'margin-bottom']);
    same('.pm-subtab-btn:hover', '.ac-section .ac-tabs button:hover', ['color', 'background']);
    same('.summary-band', '.ac-section .ac-stat-row', ['gap', 'margin', 'padding', 'background', 'border', 'border-radius']);
    same('.sb-label', '.ac-section .ac-stat-l', ['font-size', 'color', 'text-transform', 'letter-spacing', 'font-weight']);
    same('.sb-value', '.ac-section .ac-stat-v', ['font-size', 'font-weight', 'color']);
    same('.chart-wrapper', '.ac-section .ac-chart', ['background', 'border', 'border-radius', 'padding', 'margin-bottom']);
    same('.legend', '.ac-section .ac-legend', ['font-size', 'color', 'padding', 'background', 'border-radius']);
  });
  it('tables: blue header, bordered cells, zebra, hover', () => {
    const t = '.ac-section :is(.ac-table, .ac-rich table)';
    same('table', t, ['font-size', 'width']);
    same('th', `${t} th`, ['padding', 'font-weight', 'text-align', 'color', 'background', 'border']);
    same('td', `${t} td`, ['padding', 'border']);
    same('tbody tr:nth-child(even)', `${t} tbody tr:nth-child(even)`, ['background']);
    same('tbody tr:hover', `${t} tbody tr:hover`, ['background']);
  });
  it('forms: label, inputs, focus glow, check label', () => {
    same('label', '.ac-section .ac-field-l', ['font-size', 'color', 'font-weight', 'text-transform', 'letter-spacing']);
    same('input[type=number],input[type=range],select', ".ac-section :is(input[type='number'], input[type='text'], input[type='range'], input:not([type]), select, textarea)", ['padding', 'border', 'border-radius', 'background']);
    same('input:focus,select:focus', ".ac-section :is(input[type='number'], input[type='text'], input:not([type]), select, textarea):focus", ['box-shadow']);
    expect(content).toMatch(/:focus \{ border-color: #0058ab; box-shadow: 0 0 0 3px rgba\(29, 184, 242, \.3\); \}/);
    expect(content).not.toMatch(/outline: none/);   // the focus ring of the accessibility pass is never removed
  });
  it('buttons and badges', () => {
    same('.btn', '.ac-section :is(.ac-btn, button:not([class], [style], [role], [data-tone]):not(td button))', ['padding', 'border-radius', 'font-size', 'font-weight', 'cursor']);   // legacy `border: none`, here `border: 0`
    same('.btn-primary', '.ac-section :is(.ac-btn.ac-btn-primary, button[data-tone=\'primary\'])', ['background', 'color']);
    same('.btn-primary:hover', '.ac-section :is(.ac-btn.ac-btn-primary, button[data-tone=\'primary\']):hover:not(:disabled)', ['background']);
    same('.btn-del', ".ac-section button[data-tone='danger']", ['color', 'background', 'border', 'border-radius', 'font-weight']);
    same('.badge', '.ac-section .ac-badge', ['padding', 'border-radius', 'font-size', 'font-weight', 'text-transform', 'letter-spacing']);
    for (const [legacyTone, tone] of [['.badge.va', 'teal'], ['.badge.nva', 'brick'], ['.badge.nvan', 'amber'], ['.badge.dev', 'blue'], ['.badge.setup', 'grey']] as const)
      same(legacyTone, `.ac-badge[data-tone='${tone}']`, ['color', 'background']);
  });
  it('toast: the legacy sbToast look', () => {
    const live = shell.toLowerCase().match(/^\.ac-live \{[^}]*\}/m)?.[0] ?? '';
    for (const v of ['bottom: 26px', 'background: #0058ab', 'border-radius: 8px', 'font: 600 13px calibri, sans-serif', 'box-shadow: 0 6px 22px rgba(20, 30, 70, .28)']) expect(live).toContain(v);
    expect(shell).toMatch(/\.ac-live:not\(:empty\) \{ padding: 9px 18px; \}/);
  });
});
