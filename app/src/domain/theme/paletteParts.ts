/** @calc-zone presentation */
/**
 * The building blocks of the one-colour palette generator (docs/THEME.md §8.9), in OKLCH: a three-point profile over the contrast slider
 * (soft / balanced / strong), the darkening that fits a colour to a contrast ratio, the semantic families pulled toward the seed (their hue moves
 * a little, never out of its family) and the categorical chart series of each harmony.
 */
import { contrastRatio, fromOklch, hexToRgb, toOklch } from './color';
import type { Harmony } from './generatorSettings';

export type Lch = readonly [L: number, C: number, h: number];
export const lch = (hex: string): Lch => toOklch(hexToRgb(hex) ?? [0, 0, 0]);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** The value at slider position `t` (0..1) of a profile given at soft (0), balanced (.5) and strong (1). */
export const by = (t: number, soft: number, mid: number, strong: number): number => (t < 0.5 ? lerp(soft, mid, t * 2) : lerp(mid, strong, (t - 0.5) * 2));
/** Signed hue difference a → b in degrees (-180..180). */
export const hueDiff = (a: number, b: number): number => ((b - a + 540) % 360) - 180;
export const turnHue = (h: number, d: number): number => (h + d + 360) % 360;

/** The colour (L, C, h), darkened in steps of .005 L until it reaches `min`:1 on every background of `on` (black at worst). */
export function fitDark(L: number, C: number, h: number, on: readonly string[], min: number): string {
  for (let l = Math.min(1, L); l > 0; l -= 0.005) {
    const hex = fromOklch(l, C, h);
    if (on.every((b) => contrastRatio(hex, b) >= min)) return hex;
  }
  return fromOklch(0, 0, h);
}

/** The default anchor (OKLCH) of each semantic family and how far its hue may follow the seed (degrees). */
const SEMANTIC = {
  teal: { lch: [0.492, 0.084, 207], pull: 14 }, success: { lch: [0.538, 0.124, 134], pull: 12 },
  warning: { lch: [0.53, 0.153, 44], pull: 7 }, danger: { lch: [0.453, 0.126, 21], pull: 7 },
} as const satisfies Record<string, { lch: Lch; pull: number }>;
export type SemanticKey = keyof typeof SEMANTIC;

export interface Seed { L: number; C: number; h: number; grey: boolean }
export const seedOf = (hex: string): Seed => { const [L, C, h] = lch(hex); return { L, C, h, grey: C < 0.03 }; };

/** A semantic family's anchor: its own hue pulled toward the seed (a fifth of the way, capped), its chroma a quarter of the way, lightness by the slider. */
export function semantic(key: SemanticKey, s: Seed, t: number, on: readonly string[]): string {
  const { lch: [L, C, h], pull } = SEMANTIC[key], d = s.grey ? 0 : Math.max(-pull, Math.min(pull, hueDiff(h, s.h) * 0.2));
  const c = (s.grey ? C : lerp(C, Math.min(0.2, s.C), 0.25)) * by(t, 0.8, 1, 1.15);
  return fitDark(L * by(t, 1.06, 1, 0.88), c, turnHue(h, d), on, 4.6);
}

/** Hue offsets from the seed of the secondary (agentic) and information (AI) accents, per harmony. */
const ACCENTS: Record<Harmony, readonly [number, number]> = { mono: [14, -14], analogous: [40, -40], complementary: [180, 150], triadic: [120, 240] };
/** The secondary and information anchors: the seed hue turned by the harmony, the default accents' lightness and chroma, as text on `on`. */
export function accents(s: Seed, t: number, harmony: Harmony, on: readonly string[]): [secondary: string, info: string] {
  const [a, b] = ACCENTS[harmony], c = (s.grey ? 0.1 : lerp(0.1, Math.min(0.2, s.C), 0.5)) * by(t, 0.8, 1, 1.15) * (harmony === 'mono' ? 0.75 : 1);
  return [fitDark(0.53 * by(t, 1.06, 1, 0.88), c, turnHue(s.h, a), on, 4.6), fitDark(0.51 * by(t, 1.06, 1, 0.88), c, turnHue(s.h, b), on, 4.6)];
}

/** Hue offsets (and, for monochrome, lightness offsets) of the 8 chart series from the seed hue. */
const CHART_HUES: Record<Harmony, readonly number[]> = {
  mono: [0, 0, 25, -25, 25, -25, 50, -50], analogous: [0, 35, -35, 70, -70, 105, -105, 180],
  complementary: [0, 180, 40, 220, -40, 140, 90, 270], triadic: [0, 120, 240, 45, 165, 285, 90, 210],
};
/** Monochrome tells its series apart by lightness too: a light and a deep tier. */
const MONO_L = [0, -0.14, 0, 0, -0.14, -0.14, 0, 0];
/** The categorical series: distinct hues at an even lightness (gentle chroma when soft, saturated when strong), each a graphic (3:1) on `on`. */
export function chartSeries(s: Seed, t: number, harmony: Harmony, on: readonly string[]): string[] {
  const L = by(t, 0.66, 0.57, 0.5), C = by(t, 0.085, 0.13, 0.17);
  return CHART_HUES[harmony].map((d, i) => fitDark(L + (harmony === 'mono' ? MONO_L[i]! : 0), C, turnHue(s.h, d), on, 3));
}
