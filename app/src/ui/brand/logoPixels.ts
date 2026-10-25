/**
 * The canvas adapter of "Palette from logo" (docs/THEME.md §8.10): the only code that touches a canvas, so the screen can be tested with a stub
 * (jsdom has no canvas). The logo is already a PNG / JPEG data URL in the case: nothing is fetched (CSP `img-src data:`), and the image is drawn
 * scaled down to at most SAMPLE pixels on its longest side (enough for the dominant colours, fast to count).
 */
export interface LogoPixels { data: ArrayLike<number>; width: number; height: number }

const SAMPLE = 96;

/** The RGBA pixels of the logo, scaled down; null when the browser cannot draw it. */
export async function readLogoPixels(src: string): Promise<LogoPixels | null> {
  if (!src.startsWith('data:image/')) return null;   // never a network URL
  const img = new Image();
  await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error('The logo could not be drawn.')); img.src = src; });
  const w = img.naturalWidth || 1, h = img.naturalHeight || 1, k = Math.min(1, SAMPLE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, c.width, c.height);
  return { data: g.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
}
