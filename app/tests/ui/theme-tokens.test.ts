import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alpha, argb, resolveTokens, THEME_DEFAULT, tokIn, TOKEN_NAMES, type TokenName } from '../../src/domain/theme';
import { DEFAULT_THEME, makeTheme } from '../../src/domain/theme/resolve';
import { SCALES } from '../../src/domain/theme/scales';
import { TOKENS_FILE, withTokens } from '../../scripts/lib/theme';

/** The theme token table (docs/THEME.md) is the single source: tokens.css is generated from it and every reference resolves. */
const ROOT = join(process.cwd(), 'src');
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.(css|tsx?)$/.test(n) ? [p] : []; });
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** OKLab lightness of a #rgb / #rrggbb colour. */
function okL(hex: string): number {
  const h = hex.length === 4 ? hex.slice(1).replace(/./g, (c) => c + c) : hex.slice(1, 7), [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

const tok = DEFAULT_THEME.tok;

describe('theme tokens: one source of truth', () => {
  it('tokens.css carries exactly the generated default theme (run npm run theme:gen after editing src/domain/theme)', () => {
    const css = readFileSync(join(process.cwd(), TOKENS_FILE), 'utf8');
    expect(css).toBe(withTokens(css));
  });
  it('every token resolves (no unknown reference, no loop) and every var(--ac-*) used in src names a token', () => {
    for (const n of TOKEN_NAMES) expect(() => resolveTokens(THEME_DEFAULT[n], THEME_DEFAULT), n).not.toThrow();
    const unknown = walk(ROOT).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/var\(--ac-([a-z0-9-]+)/g)].map((m) => m[1]!).filter((n) => !(n in THEME_DEFAULT)).map((n) => `${f.slice(ROOT.length + 1)}: --ac-${n}`));
    expect(unknown).toEqual([]);
  });
  it('scale steps darken as the step grows; each colour of the default look sits on one step only', () => {
    const seen = new Map<string, string>();
    for (const [family, steps] of Object.entries(SCALES)) {
      const list = Object.entries(steps).map(([s, hex]) => [Number(s), hex] as const).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < list.length; i++) expect(okL(list[i]![1]), `${family}-${list[i]![0]}`).toBeLessThan(okL(list[i - 1]![1]));
      for (const [s, hex] of list) { const k = okL(hex).toFixed(6) + hex.length; expect(seen.get(k), `${family}-${s} duplicates ${seen.get(k)}`).toBeUndefined(); seen.set(k, `${family}-${s}`); }
    }
  });
  it('translucent steps are their base step plus the alpha the name says', () => {
    for (const n of TOKEN_NAMES.filter((t) => /-a\d+$/.test(t))) {
      const [, base, a] = /^(.*)-a(\d+)$/.exec(n)!, v = tok(n as TokenName);
      if (v.startsWith('#')) { expect(v.slice(0, 7)).toBe(alpha(base as TokenName, 1).replace(/rgba\((\d+),(\d+),(\d+),1\)/, (_, r, g, b) => '#' + [r, g, b].map((x: string) => Number(x).toString(16).padStart(2, '0')).join(''))); continue; }
      const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(v)!;
      expect(`rgba(${m[1]},${m[2]},${m[3]},1)`, n).toBe(alpha(base as TokenName, 1));
      expect(Math.round(Number(m[4]) * 100), n).toBe(Number(a));
    }
  });
  it('keeps the legacy values: v18 token names, chrome, exports', () => {
    const v: Partial<Record<TokenName, string>> = { blue: '#0058ab', teal: '#006e79', brick: '#8f3237', amber: '#b04600', focus: '#0058ab', ink: '#333', muted: '#636363', line: '#e3e3e3',
      surface: '#fff', bg: '#f5f6fa', radius: '6px', 'header-end': '#121a38', 'kpibar-end': '#00488c', 'shadow-card': '0 2px 10px rgba(18, 26, 56, .08)' };
    for (const [n, want] of Object.entries(v)) expect(tok(n as TokenName), n).toBe(want);
    expect(['excel-head-bg', 'excel-head-text', 'excel-subtotal-bg', 'excel-band-bg', 'excel-note', 'excel-input', 'excel-border'].map((n) => argb(THEME_DEFAULT, n as TokenName)))
      .toEqual(['FF1E2761', 'FFFFFFFF', 'FFE8ECF7', 'FFD9E2F3', 'FF808080', 'FF1F5F9A', 'FFD9D9D9']);
  });
  it('another base theme reaches tok(), the palettes and the references built on a step; the tables stay independent', () => {
    expect(DEFAULT_THEME.list(['chart-cat-1', 'chart-cat-2'])).toEqual(['#0058ab', '#006e79']);
    const t = makeTheme({ ...THEME_DEFAULT, 'primary-700': '#123456' });
    expect([t.tok('blue'), t.tok('header-start'), t.list(['chart-cat-1'])[0], t.tok('shadow-rail')]).toEqual(['#123456', '#123456', '#123456', 'inset 4px 0 0 #123456']);
    expect(t.list(['chart-cat-1', 'chart-cat-2'])).toEqual(['#123456', '#006e79']);
    expect([tok('blue'), tokIn(THEME_DEFAULT, 'blue')]).toEqual(['#0058ab', '#0058ab']);   // no shared state: the default theme is untouched
  });
});
