import { isLogoSrc, logoFileProblem } from '@/domain/theme/logo';

/** Longest side of a rasterised SVG logo, in pixels (crisp at the header's ~26 px height on a 3x screen, small as a PNG). */
const SVG_MAX = 480;

const readDataUrl = (f: Blob): Promise<string> => new Promise((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => ko(new Error('The file could not be read.'));
  r.readAsDataURL(f);
});

/**
 * An SVG drawn into a canvas and saved as PNG: an <img> renders an SVG without running its scripts or loading external resources, and only the
 * pixels reach the case, so no markup is ever stored.
 */
async function rasterise(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error('The SVG could not be drawn.')); img.src = url; });
    const w = img.naturalWidth || 300, h = img.naturalHeight || 100, k = Math.min(1, SVG_MAX / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d');
    if (!g) throw new Error('This browser cannot convert an SVG logo: use a PNG or JPEG.');
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

/** The data URL to store for a picked logo file (PNG / JPEG as is, SVG rasterised to PNG); throws with a readable message otherwise. */
export async function readLogoFile(f: File): Promise<string> {
  const problem = logoFileProblem(f.type, f.size);
  if (problem) throw new Error(problem);
  const src = f.type === 'image/svg+xml' ? await rasterise(f) : await readDataUrl(f);
  if (!isLogoSrc(src)) throw new Error('The image could not be stored (not a PNG or JPEG, or too large once converted).');
  return src;
}
