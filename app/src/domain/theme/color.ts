/** @calc-zone presentation */
/**
 * Colour arithmetic of the theme (docs/THEME.md §6): hex <-> OKLab / OKLCH, sRGB gamut mapping, WCAG 2.x luminance and contrast ratio.
 * The display modes (dark, contrast levels) derive their scale steps with `remapLightness()`; the contrast test reads `contrastRatio()`.
 */
export type Rgb = readonly [number, number, number];

/** `#rgb`, `#rrggbb` or `#rrggbbaa` as 0..255 channels (alpha ignored); null when it is not a hex colour. */
export function hexToRgb(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!.slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
export const rgbToHex = (c: Rgb): string => '#' + c.map((v) => clamp255(v).toString(16).padStart(2, '0')).join('');

const lin = (c: number): number => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = (v: number): number => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** OKLCH (L 0..1, C, h in degrees) of an sRGB colour. */
export function toOklch(c: Rgb): [number, number, number] {
  const [r, g, b] = c.map(lin) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
/** Linear-light sRGB of an OKLCH colour (may fall outside 0..1). */
function oklchToLinear(L: number, C: number, h: number): [number, number, number] {
  const A = C * Math.cos((h * Math.PI) / 180), B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
/** The sRGB colour of OKLCH (L, C, h), chroma reduced until it fits the gamut (lightness and hue kept). */
export function fromOklch(L: number, C: number, h: number): string {
  const Lc = Math.max(0, Math.min(1, L));
  let c = C;
  for (let i = 0; i < 40; i++) {
    const rgb = oklchToLinear(Lc, c, h);
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) return rgbToHex(rgb.map((v) => gam(Math.max(0, Math.min(1, v)))) as unknown as Rgb);
    c *= 0.9;
  }
  return rgbToHex(oklchToLinear(Lc, 0, h).map((v) => gam(Math.max(0, Math.min(1, v)))) as unknown as Rgb);
}

/** A colour with its OKLab lightness passed through `f` (hue kept, chroma scaled by `chroma(Lout)`), gamut-mapped. */
export function remapLightness(hex: string, f: (L: number) => number, chroma: (L: number) => number = () => 1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [L, C, h] = toOklch(rgb), out = f(L);
  return fromOklch(out, C * chroma(out), h);
}
/** Piecewise-linear interpolation through `[x, y]` points sorted by x ascending (clamped outside). */
export function curve(points: readonly (readonly [number, number])[]): (x: number) => number {
  return (x) => {
    if (x <= points[0]![0]) return points[0]![1];
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i]!, [x0, y0] = points[i - 1]!;
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return points[points.length - 1]![1];
  };
}

/** WCAG 2.x relative luminance of a hex colour (null when it is not one). */
export function luminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio of two hex colours (21 when either is not a hex colour, so callers never "correct" a gradient or a var()). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return la == null || lb == null ? 21 : (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** `rgba(r,g,b,a)` with the channels of a hex colour. */
export function rgbaOf(hex: string, a: number): string {
  const c = hexToRgb(hex) ?? [0, 0, 0];
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
