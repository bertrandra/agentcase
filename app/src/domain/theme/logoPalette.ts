/** @calc-zone presentation */
import { rgbToHex, toOklch, type Rgb } from './color';

/**
 * "Palette from logo" (docs/THEME.md §8.10): the dominant non-neutral colours of the customer logo, from its RGBA pixels (the canvas adapter of
 * the screen reads them; this function is pure). Transparent, near-white, near-black and low-chroma (grey) pixels are ignored; the others are
 * counted in a 4-bit-per-channel histogram, the bins merged into clusters of close colours (OKLab distance), ranked by pixel count.
 */
export interface LogoColour { hex: string; share: number }
export interface LogoColourOptions { max?: number; minShare?: number }

/** Thresholds (OKLCH): a pixel counts when it is mostly opaque, neither near-white nor near-black, and visibly coloured. */
export const LOGO_LIMITS = { alpha: 128, lightMax: 0.94, lightMin: 0.2, chromaMin: 0.045, merge: 0.09 } as const;

interface Bin { n: number; r: number; g: number; b: number }
const lab = ([L, C, h]: [number, number, number]): [number, number, number] =>
  [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
const avg = (x: Bin): Rgb => [x.r / x.n, x.g / x.n, x.b / x.n];
const dist = (a: [number, number, number], b: [number, number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Is this pixel a candidate colour (not transparent, white, black or grey)? */
export function isBrandPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < LOGO_LIMITS.alpha) return false;
  const [L, C] = toOklch([r, g, b]);
  return L <= LOGO_LIMITS.lightMax && L >= LOGO_LIMITS.lightMin && C >= LOGO_LIMITS.chromaMin;
}

/** The histogram of the candidate pixels: 4096 bins (4 bits per channel), each with its pixel count and channel sums. */
function histogram(px: ArrayLike<number>): { bins: Map<number, Bin>; counted: number } {
  const bins = new Map<number, Bin>();
  let counted = 0;
  for (let i = 0; i + 3 < px.length; i += 4) {
    const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
    if (!isBrandPixel(r, g, b, px[i + 3]!)) continue;
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4), x = bins.get(k);
    if (x) { x.n++; x.r += r; x.g += g; x.b += b; } else bins.set(k, { n: 1, r, g, b });
    counted++;
  }
  return { bins, counted };
}

/**
 * The dominant colours of a logo, most frequent first: `share` = the cluster's part of the coloured pixels (0..1). At most `max` (default 4)
 * colours, each at least `minShare` (default 3 %) of them. Empty when the logo has no coloured pixel (a black, white or grey logo).
 */
export function logoColours(px: ArrayLike<number>, opts: LogoColourOptions = {}): LogoColour[] {
  const { bins, counted } = histogram(px);
  if (!counted) return [];
  const sorted = [...bins.entries()].sort((a, b) => b[1].n - a[1].n || a[0] - b[0]).map(([, x]) => x);
  const clusters: { bin: Bin; at: [number, number, number] }[] = [];
  for (const x of sorted) {
    const at = lab(toOklch(avg(x))), near = clusters.find((c) => dist(c.at, at) < LOGO_LIMITS.merge);
    if (!near) { clusters.push({ bin: { ...x }, at }); continue; }
    near.bin.n += x.n; near.bin.r += x.r; near.bin.g += x.g; near.bin.b += x.b;   // the centroid stays the seed bin's: the ranking is stable
  }
  const minShare = opts.minShare ?? 0.03;
  return clusters.sort((a, b) => b.bin.n - a.bin.n).map((c) => ({ hex: rgbToHex(avg(c.bin)), share: c.bin.n / counted }))
    .filter((c) => c.share >= minShare).slice(0, opts.max ?? 4);
}
