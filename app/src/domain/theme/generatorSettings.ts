/** @calc-zone presentation */
/**
 * The settings of the one-colour palette generator (docs/THEME.md §8.9), stored on a user theme (`generator`) so the editor reopens on them:
 * the seed colour, the palette contrast (0 soft, 50 balanced, 100 strong) and the colour harmony of the accents and chart series.
 */
export type Harmony = 'mono' | 'analogous' | 'complementary' | 'triadic';
export const HARMONIES: readonly Harmony[] = ['mono', 'analogous', 'complementary', 'triadic'];
export const HARMONY_LABELS: Record<Harmony, string> = { mono: 'Monochrome', analogous: 'Analogous', complementary: 'Complementary', triadic: 'Triadic' };
export interface GeneratorSettings { seed: string; contrast: number; harmony: Harmony }
export const GENERATOR_DEFAULTS = { contrast: 50, harmony: 'analogous' } as const satisfies Omit<GeneratorSettings, 'seed'>;

const isHarmony = (v: unknown): v is Harmony => (HARMONIES as readonly unknown[]).includes(v);
const hex6 = (v: unknown): string | null => (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? v.trim().toLowerCase().replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : null);
/** The contrast as an integer 0..100 (NaN and out-of-range values clamped; null when it is not a number). */
export const clampContrast = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
};

/** Validated generator settings (null when the seed is not a colour; a bad contrast or harmony falls back to its default). */
export function parseGenerator(raw: unknown): GeneratorSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>, seed = hex6(r.seed);
  if (!seed) return null;
  return { seed, contrast: clampContrast(r.contrast) ?? GENERATOR_DEFAULTS.contrast, harmony: isHarmony(r.harmony) ? r.harmony : GENERATOR_DEFAULTS.harmony };
}

/** The words of the contrast slider: Soft (0-33), Balanced (34-66), Strong (67-100). */
export const contrastWord = (c: number): 'Soft' | 'Balanced' | 'Strong' => (c <= 33 ? 'Soft' : c <= 66 ? 'Balanced' : 'Strong');
