import type { Tok } from '@/domain/theme/resolve';
import { contrastRatio, luminance } from '@/domain/theme/color';

/** WCAG contrast ratio of two hex colours (21 when either is not a plain hex colour). */
export const contrast = (a: string, b: string): number => contrastRatio(a, b);

/**
 * A data colour (a group's accent, a scenario hue) used as TEXT: moved in small steps, hue kept, until it reads at 4.5:1 on `bg` (the surface
 * by default) — darkened on a light background, lightened on a dark one (dark display mode). Borders and fills keep the original colour; only
 * glyphs are corrected. A value that is not a plain hex colour is returned unchanged. `tok`: the theme in effect (`useTheme().tok`).
 */
export function textColor(hex: string, tok: Tok, bg = tok('neutral-0'), min = 4.5): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex), dark = (luminance(bg) ?? 1) < 0.18;
  // on a dark page the cell may sit on any of the dark surfaces: read against the lightest one too
  const reads = (c: string): boolean => contrast(c, bg) >= min && (!dark || contrast(c, tok('surface-raised')) >= min);
  if (!m || reads(hex)) return hex;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!, rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let k = 1; k <= 20; k++) {
    const out = '#' + rgb.map((v) => Math.round(dark ? v + (255 - v) * k * 0.05 : v * (1 - k * 0.05)).toString(16).padStart(2, '0')).join('');
    if (reads(out)) return out;
  }
  return tok(dark ? 'text-strong' : 'neutral-1000');
}
