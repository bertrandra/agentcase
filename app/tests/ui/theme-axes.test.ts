import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveTokens, THEME_DEFAULT, type ThemeValues, type TokenName } from '../../src/domain/theme';
import { DEFAULT_THEME, makeTheme } from '../../src/domain/theme/resolve';
import { AXES, AXIS_DEFAULTS, AXIS_NAMES, axisAttr, axisAttributes, axisTokens, axisValues, isAxisValue } from '../../src/domain/theme/axes';
import { dependents } from '../../src/domain/theme/axesCss';
import { AXES_FILE, axesFile } from '../../scripts/lib/themeAxes';

/** The theme axes (docs/THEME.md §6): one TS table per axis, axes.css generated from it, every value resolvable, the defaults the legacy look. */
const table = (k: (typeof AXIS_NAMES)[number], v: string) => (AXES[k].values as Record<string, Partial<ThemeValues>>)[v]!;

describe('theme axes: tables and generated CSS', () => {
  it('axes.css is exactly the generated file (run npm run theme:gen after editing src/domain/theme)', () => {
    expect(readFileSync(join(process.cwd(), AXES_FILE), 'utf8')).toBe(axesFile());
  });
  it('every non-default value that changes tokens has its block; defaults and control variants have none', () => {
    const css = axesFile();
    for (const k of AXIS_NAMES) {
      expect(Object.keys(table(k, AXES[k].default)), `${k} default changes nothing`).toEqual([]);
      for (const v of axisValues(k)) {
        const sel = `[${axisAttr(k)}='${v}']`, set = table(k, v);
        if (v === AXES[k].default || !Object.keys(set).length) { expect(css.includes(sel), sel).toBe(false); continue; }
        const block = css.split('\n').find((l) => l.startsWith(`${sel} { `)) ?? '';
        for (const n of Object.keys(set)) expect(block, `${sel} --ac-${n}`).toContain(`--ac-${n}: `);
      }
    }
  });
  it('every value names known tokens and resolves (no unknown reference, no loop) on top of the default table', () => {
    for (const k of AXIS_NAMES) for (const v of axisValues(k)) {
      const set = table(k, v), merged = { ...THEME_DEFAULT, ...set } as ThemeValues;
      for (const n of Object.keys(set)) {
        expect(n in THEME_DEFAULT, `${k}=${v}: unknown token ${n}`).toBe(true);
        expect(() => resolveTokens(merged[n as TokenName], merged), `${k}=${v}: ${n}`).not.toThrow();
      }
    }
  });
  it('the tokens T3 adds hold the pre-T3 values by default (the default look is unchanged)', () => {
    const want: Partial<Record<TokenName, string>> = { 'space-block': '1.5rem', 'space-heading': '1.5rem', 'space-field': '1.25rem', 'space-row': '12px',
      'box-border': '1px', 'shadow-box': 'none', 'box-bg': '#fff', 'callout-rail': '4px', 'radius-button': '6px', 'border-control': '1px',
      'font-size-figure': '20px', 'font-size-kpi': '16px', 'font-weight-display': '300', 'numeric-figures': 'normal' };
    for (const [n, v] of Object.entries(want)) expect(DEFAULT_THEME.tok(n as TokenName), n).toBe(v);
    expect(axisTokens(AXIS_DEFAULTS)).toEqual({});
    expect(axisAttributes(AXIS_DEFAULTS)).toEqual({});
  });
  it('the size scales keep the ladder in order and change every size', () => {
    const sizes = (Object.keys(THEME_DEFAULT) as TokenName[]).filter((n) => /^font-size-[0-9]?[a-z]+(-plus)?$/.test(n) && THEME_DEFAULT[n].endsWith('px'));
    const px = (t: Partial<ThemeValues>) => sizes.map((n) => parseFloat(t[n] ?? THEME_DEFAULT[n]));
    const order = [...sizes].sort((a, b) => parseFloat(THEME_DEFAULT[a]) - parseFloat(THEME_DEFAULT[b]));
    for (const v of ['compact', 'large'] as const) {
      const set = table('typeScale', v), vals = order.map((n) => parseFloat(set[n]!));
      for (let i = 1; i < vals.length; i++) expect(vals[i]!, `${v} ${order[i]}`).toBeGreaterThanOrEqual(vals[i - 1]!);
      expect(px(set).every((x, i) => (v === 'large' ? x > px({})[i]! : x <= px({})[i]!))).toBe(true);
    }
  });
  it('axisTokens feed the base table: tok() of the theme follows the axes (charts, exports)', () => {
    const a = makeTheme({ ...THEME_DEFAULT, ...axisTokens({ density: 'compact', radius: 'square', buttons: 'pill', fontNumeric: 'mono' }) });
    expect([a.tok('pad-card'), a.tok('radius'), a.tok('radius-button'), a.tok('numeric-figures')]).toEqual(['.85rem', '0px', '999px', 'tabular-nums']);
    expect(a.tok('font-numeric')).toMatch(/monospace$/);
    const b = makeTheme({ ...THEME_DEFAULT, ...axisTokens({ density: 'spacious', box: 'elevated' }) });
    expect([b.tok('font-size-figure'), b.tok('shadow-box'), b.tok('box-border')]).toEqual(['30px', b.tok('shadow-sm'), '0px']);
  });
  it('attributes: only non-default, valid values; names follow the axis key', () => {
    expect(axisAttr('fontBody')).toBe('data-ac-font-body');
    expect(axisAttributes({ density: 'compact', radius: 'soft', box: 'nope' as never })).toEqual({ 'data-ac-density': 'compact' });
    expect(isAxisValue('controlsChoice', 'segmented')).toBe(true);
    expect(isAxisValue('controlsChoice', 'toString')).toBe(false);
  });
  it('dependents: the tokens built on a changed one, transitively', () => {
    expect(dependents(['radius-md'])).toEqual(expect.arrayContaining(['radius', 'radius-button']));
    expect(dependents(['shadow-sm'])).toEqual(expect.arrayContaining(['shadow-card', 'shadow-focus'].filter((n) => THEME_DEFAULT[n as TokenName].includes('shadow-sm'))));
    expect(dependents(['font-body'])).toEqual(expect.arrayContaining(['font-heading', 'font-numeric', 'font']));
  });
});
