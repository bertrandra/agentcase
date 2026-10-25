import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_KEYWORDS, argbLiterals, hardcodedStyles } from '../helpers/hardcodedStyle';

/**
 * **No visual value outside the theme tokens** (docs/THEME.md). Colours, font families and shadows of the UI come from `var(--ac-*)` (CSS, inline
 * styles, SVG attributes) or `tok()` (charts, colour arithmetic); the exports and the domain read-outs use `tok()` / `argb()`. A theme (T2-T4)
 * then only switches token values. The token files themselves are the only place a literal may live.
 */
const ROOT = join(process.cwd(), 'src');
const walk = (d: string, ext: RegExp): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p, ext) : ext.test(n) ? [p] : []; });
/** Files allowed to hold literals, each with its reason. */
const ALLOWED_FILES: Record<string, string> = {
  'ui/theme/tokens.css': 'the generated default theme (src/domain/theme rendered as custom properties)',
  'ui/theme/fonts.css': "the embedded Ubuntu faces: @font-face names the family it declares ('Ubuntu')",
};
const rel = (f: string) => f.slice(ROOT.length + 1);
const scan = (files: string[]) => files.filter((f) => !ALLOWED_FILES[rel(f)] && !rel(f).startsWith('domain/theme/')).flatMap((f) => hardcodedStyles(f, readFileSync(f, 'utf8')).map((h) => `${rel(f)}:${h}`));

describe('no hard-coded visual value (theme tokens only)', () => {
  it('src/ui: no colour, font family or raw box-shadow in .css / .ts / .tsx outside the token files', () => {
    expect(scan(walk(join(ROOT, 'ui'), /\.(css|tsx?)$/))).toEqual([]);
  });
  it('src/domain and src/store: visual colours come from the theme module (no hex / rgb literal, no ARGB literal)', () => {
    const files = [...walk(join(ROOT, 'domain'), /\.tsx?$/), ...walk(join(ROOT, 'store'), /\.tsx?$/)];
    expect(scan(files)).toEqual([]);
    expect(files.filter((f) => !rel(f).startsWith('domain/theme/')).flatMap((f) => argbLiterals(readFileSync(f, 'utf8')).map((a) => `${rel(f)}: ${a}`))).toEqual([]);
  });
  it('every allowance is explained', () => {
    for (const why of [...Object.values(ALLOWED_FILES), ...Object.values(ALLOWED_KEYWORDS)]) expect(why.length).toBeGreaterThan(20);
  });
});

describe('the guard itself (negative tests)', () => {
  const css = (s: string) => hardcodedStyles('x.css', s), tsx = (s: string) => hardcodedStyles('x.tsx', s);
  it('catches literals', () => {
    for (const s of ['.a { color: #fff; }', '.a { background: rgba(0, 0, 0, .1); }', '.a { color: hsl(10, 20%, 30%); }', '.a { border: 1px solid white; }',
      ".a { font-family: Arial, sans-serif; }", ".a { font: 600 13px Calibri, sans-serif; }", '.a { box-shadow: 0 1px 2px var(--ac-line); }',
      '.a { box-shadow: 0 0 1px var(--dyn-group-color); }']) expect(css(s), s).not.toEqual([]);
    for (const s of ["const a = <b style={{ color: '#8F3237' }} />;", "const c = 'rgba(1,2,3,.5)';", "<b style={{ boxShadow: '0 0 1px var(--ac-line)' }} />",
      "<b style={{ fontFamily: 'Arial' }} />", "<b style={{ background: 'white' }} />", '<rect fill="#fff" />']) expect(tsx(s), s).not.toEqual([]);
    expect(argbLiterals("c.fill = { argb: 'FF1E2761' };")).toHaveLength(1);
  });
  it('lets tokens, keywords and comments through', () => {
    for (const s of ['.a { color: var(--ac-ink); background: transparent; box-shadow: var(--ac-shadow-card); }', '/* legacy #0058AB */ .a { font: inherit; }',
      '.a { font-family: var(--ac-font-mono); } .b { outline: 2px solid Highlight; } .c { box-shadow: none; }', '.a { font: var(--ac-font-size-md) / var(--ac-leading-code) var(--ac-font-mono); }',
      '.a { box-shadow: var(--ac-shadow-rail-offset) var(--dyn-group-color); }']) expect(css(s), s).toEqual([]);
    for (const s of ["<b style={{ color: 'var(--ac-brick)' }} />", "const c = tok('primary-700'); // was #0058AB", "<rect fill=\"var(--ac-neutral-0)\" />", "const e = '&#160;';",
      "<b style={{ boxShadow: `var(--ac-shadow-rail-offset) ${c}` }} />"]) expect(tsx(s), s).toEqual([]);
  });
});
