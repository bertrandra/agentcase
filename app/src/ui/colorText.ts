/** WCAG 2.x relative luminance of an #rgb / #rrggbb colour (null when it is not one). */
function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  const ch = [0, 2, 4].map((i) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
export const contrast = (a: string, b: string): number => {
  const la = luminance(a), lb = luminance(b);
  return la == null || lb == null ? 21 : (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * A data colour (a group's accent, a scenario hue) used as TEXT: darkened in small steps, hue kept, until it reads at 4.5:1 on `bg` (white by default).
 * Borders and fills keep the original colour; only glyphs are corrected. A value that is not a plain hex colour is returned unchanged.
 */
export function textColor(hex: string, bg = '#ffffff', min = 4.5): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m || contrast(hex, bg) >= min) return hex;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!, rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let k = 1; k <= 20; k++) {
    const out = '#' + rgb.map((v) => Math.round(v * (1 - k * 0.05)).toString(16).padStart(2, '0')).join('');
    if (contrast(out, bg) >= min) return out;
  }
  return '#000000';
}
