import { describe, expect, it } from 'vitest';
import { hexToRgb, toOklch } from '@/domain/theme/color';
import { isBrandPixel, logoColours } from '@/domain/theme/logoPalette';

/** Synthetic RGBA pixels: [r, g, b, a, how many]. */
const pixels = (runs: [number, number, number, number, number][]): Uint8ClampedArray => {
  const out: number[] = [];
  for (const [r, g, b, a, n] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return new Uint8ClampedArray(out);
};
const WHITE: [number, number, number, number, number] = [255, 255, 255, 255, 5000];
const BLACK: [number, number, number, number, number] = [0, 0, 0, 255, 3000];
const close = (hex: string, r: number, g: number, b: number): boolean => {
  const c = hexToRgb(hex)!;
  return Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) <= 6;
};

describe('logoColours: the dominant non-neutral colours of a logo (docs/THEME.md §8.10)', () => {
  it('ignores white, black, grey and transparent pixels, however many', () => {
    expect(logoColours(pixels([WHITE, BLACK, [128, 128, 128, 255, 2000], [200, 30, 30, 0, 900], [250, 250, 245, 255, 100]]))).toEqual([]);
    expect(logoColours(new Uint8ClampedArray(0))).toEqual([]);
    expect(isBrandPixel(0, 112, 173, 255)).toBe(true);
    expect(isBrandPixel(0, 112, 173, 100)).toBe(false);   // mostly transparent
    expect(isBrandPixel(120, 124, 128, 255)).toBe(false);  // bluish grey: too little chroma
  });
  it('finds the brand colour on a white background with black text', () => {
    const c = logoColours(pixels([WHITE, BLACK, [0, 112, 173, 255, 400]]));
    expect(c).toHaveLength(1);
    expect(c[0]!.hex).toBe('#0070ad');
    expect(c[0]!.share).toBe(1);
  });
  it('ranks several colours by pixel count, shares of the coloured pixels only', () => {
    const c = logoColours(pixels([WHITE, [0, 112, 173, 255, 300], [230, 120, 20, 255, 600], [20, 150, 60, 255, 100]]));
    expect(c.map((x) => x.hex)).toEqual(['#e67814', '#0070ad', '#14963c']);
    expect(c.map((x) => x.share)).toEqual([0.6, 0.3, 0.1]);
  });
  it('merges anti-aliased shades of one colour into one cluster', () => {
    const shades: [number, number, number, number, number][] = [[0, 112, 173, 255, 500], [8, 118, 180, 255, 120], [0, 104, 164, 255, 80],
      [4, 115, 176, 200, 60]];
    const c = logoColours(pixels([WHITE, ...shades, [230, 120, 20, 255, 100]]));
    expect(c).toHaveLength(2);
    expect(close(c[0]!.hex, 0, 112, 173)).toBe(true);
    expect(c[0]!.share).toBeCloseTo(760 / 860, 10);
    const [, C] = toOklch(hexToRgb(c[0]!.hex)!);
    expect(C).toBeGreaterThan(0.1);
  });
  it('drops specks below minShare and keeps at most max colours', () => {
    const many = pixels([[0, 112, 173, 255, 500], [230, 120, 20, 255, 300], [20, 150, 60, 255, 150], [150, 40, 160, 255, 40], [200, 30, 30, 255, 10]]);
    expect(logoColours(many).map((x) => x.hex)).toEqual(['#0070ad', '#e67814', '#14963c', '#9628a0']);   // the red speck (1 %) is dropped
    expect(logoColours(many, { max: 2 })).toHaveLength(2);
    expect(logoColours(many, { minShare: 0.2 }).map((x) => x.hex)).toEqual(['#0070ad', '#e67814']);
  });
  it('is deterministic and ignores a trailing partial pixel', () => {
    const a = pixels([[0, 112, 173, 255, 10], [230, 120, 20, 255, 10]]), b = new Uint8ClampedArray([...a, 9, 9]);
    expect(logoColours(b)).toEqual(logoColours(a));
    expect(logoColours(a)).toEqual(logoColours(a));
  });
});
