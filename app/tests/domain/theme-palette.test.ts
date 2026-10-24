import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, toOklch } from '../../src/domain/theme/color';
import { HARMONIES, parseGenerator, contrastWord, type Harmony } from '../../src/domain/theme/generatorSettings';
import { paletteFromSeed, paletteTable, type Palette } from '../../src/domain/theme/palette';
import { hueDiff } from '../../src/domain/theme/paletteParts';
import { COLOUR_KEYS } from '../../src/domain/theme/themeDef';

/** The one-colour palette generator (docs/THEME.md §8.9): completeness, determinism, the seed as brand colour, meaning kept, contrast monotonic. */
const lch = (hex: string) => toOklch(hexToRgb(hex)!);
const SEEDS = ['#0b7a75', '#0058ab', '#ffff66', '#101010', '#808080', '#ff00ff', '#ff0000', '#16693a', '#ffa500', '#5b2a9e', '#00ffff', '#f0f0f0'];
const STEPS = [0, 25, 50, 75, 100];
const all = (f: (seed: string, c: number, h: Harmony, p: Palette) => void) => {
  for (const seed of SEEDS) for (const c of STEPS) for (const h of HARMONIES) f(seed, c, h, paletteFromSeed(seed, { contrast: c, harmony: h }));
};

describe('paletteFromSeed', () => {
  it('sets every colour a theme can set, as #rrggbb, and is deterministic', () => {
    const p = paletteFromSeed('#0b7a75', { contrast: 60, harmony: 'triadic' });
    expect(Object.keys(p).sort()).toEqual([...COLOUR_KEYS].sort());
    for (const v of Object.values(p)) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    expect(paletteFromSeed('#0B7A75', { contrast: 60, harmony: 'triadic' })).toEqual(p);
    expect(paletteFromSeed('#0b7a75', { contrast: 60 })).toEqual(paletteFromSeed('#0b7a75', { contrast: 60, harmony: 'analogous' }));
  });
  it('the primary colour is the seed when white text reads on it; otherwise the seed darkened (hue kept) until it does', () => {
    for (const seed of ['#0b7a75', '#0058ab', '#8b1a2b', '#101010', '#5b2a9e']) for (const c of STEPS) expect(paletteFromSeed(seed, { contrast: c }).primary).toBe(seed);
    for (const seed of ['#ffff66', '#ff00ff', '#ffa500', '#00ffff']) {
      const p = paletteFromSeed(seed, { contrast: 50 }).primary;
      expect(contrastRatio(p, '#ffffff')).toBeGreaterThanOrEqual(5);
      expect(Math.abs(hueDiff(lch(p)[2], lch(seed)[2]))).toBeLessThan(6);
      expect(lch(p)[0]).toBeLessThan(lch(seed)[0]);
    }
  });
  it('the semantic families keep their meaning: teal, green, amber / orange, red (and the business colours on them)', () => {
    const range = { teal: [185, 225], success: [118, 150], warning: [33, 55], danger: [10, 32] } as const;
    all((seed, c, h, p) => {
      for (const [k, [lo, hi]] of Object.entries(range)) expect(lch(p[k as keyof typeof range])[2], `${seed} ${c} ${h} ${k}`).toSatisfy((x: number) => x >= lo && x <= hi);
      expect([p.automation, p['glass-ceiling'], p['human-supervision']]).toEqual([p.teal, p.danger, p.warning]);
    });
  });
  it('the 8 chart series are distinct colours at an even-ish lightness', () => {
    all((seed, c, h, p) => {
      const s = Array.from({ length: 8 }, (_, i) => lch(p[`chart-cat-${i + 1}` as keyof Palette]));
      expect(new Set(Array.from({ length: 8 }, (_, i) => p[`chart-cat-${i + 1}` as keyof Palette])).size, `${seed} ${c} ${h}`).toBe(8);
      const L = s.map((x) => x[0]);
      expect(Math.max(...L) - Math.min(...L), `${seed} ${c} ${h}`).toBeLessThan(h === 'mono' ? 0.3 : 0.2);
    });
  });
  it('more contrast: ink on surface and the header text on the header never decrease along the slider, and grow from soft to strong', () => {
    for (const seed of SEEDS) for (const h of HARMONIES) {
      const r = STEPS.map((c) => paletteTable(paletteFromSeed(seed, { contrast: c, harmony: h }), 'light', 'standard'));
      const ink = r.map((t) => contrastRatio(t.ink, t.surface)), head = r.map((t) => contrastRatio(t['header-text'], t['header-start']));
      for (let i = 1; i < r.length; i++) {
        expect(ink[i]! + 1e-9, `${seed} ${h} ink ${ink}`).toBeGreaterThanOrEqual(ink[i - 1]!);
        expect(head[i]! + 1e-9, `${seed} ${h} header ${head}`).toBeGreaterThanOrEqual(head[i - 1]!);
      }
      expect(ink[4]!).toBeGreaterThan(ink[0]! + 1);
      expect(head[4]!).toBeGreaterThan(head[0]! + 1);
    }
  });
  it('soft is pastel and gentle, strong is deep and saturated', () => {
    const soft = paletteFromSeed('#0b7a75', { contrast: 0 }), strong = paletteFromSeed('#0b7a75', { contrast: 100 });
    expect(lch(soft.bg)[1]).toBeGreaterThan(lch(strong.bg)[1]);
    expect(lch(soft['header-start'])[0]).toBeGreaterThan(lch(strong['header-start'])[0]);
    expect(lch(soft['chart-cat-2'])[1]).toBeLessThan(lch(strong['chart-cat-2'])[1]);
    expect(contrastRatio(strong['line-strong'], strong.surface)).toBeGreaterThan(contrastRatio(soft['line-strong'], soft.surface));
  });
  it('clamps the contrast and reads a malformed seed as the default blue', () => {
    expect(paletteFromSeed('#0b7a75', { contrast: 140 })).toEqual(paletteFromSeed('#0b7a75', { contrast: 100 }));
    expect(paletteFromSeed('#0b7a75', { contrast: -5 })).toEqual(paletteFromSeed('#0b7a75', { contrast: 0 }));
    expect(paletteFromSeed('nope', { contrast: 50 }).primary).toBe('#0058ab');
  });
});

describe('generator settings', () => {
  it('parse validates the seed, clamps the contrast and defaults the harmony', () => {
    expect(parseGenerator({ seed: '#ABC', contrast: '60', harmony: 'triadic' })).toEqual({ seed: '#aabbcc', contrast: 60, harmony: 'triadic' });
    expect(parseGenerator({ seed: '#0b7a75', contrast: 300, harmony: 'x' })).toEqual({ seed: '#0b7a75', contrast: 100, harmony: 'analogous' });
    expect(parseGenerator({ seed: '#0b7a75' })).toEqual({ seed: '#0b7a75', contrast: 50, harmony: 'analogous' });
    for (const bad of [null, 'x', [], { seed: 'red' }, { contrast: 50 }]) expect(parseGenerator(bad)).toBeNull();
  });
  it('words the slider: Soft, Balanced, Strong', () => {
    expect([0, 33, 34, 50, 66, 67, 100].map(contrastWord)).toEqual(['Soft', 'Soft', 'Balanced', 'Balanced', 'Balanced', 'Strong', 'Strong']);
  });
});
