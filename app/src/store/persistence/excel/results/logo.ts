/** @calc-zone exports */
import type { Workbook, Worksheet } from 'exceljs';

/** Pixel size of a PNG (IHDR) or a baseline / progressive JPEG (SOF segment), read from the first bytes of its base64; null when unreadable. */
export function imageSize(b64: string, kind: 'png' | 'jpeg'): { w: number; h: number } | null {
  let bin: string;
  try { bin = atob(b64.slice(0, 87380)); } catch { return null; }   // the first 64 KB hold the header of any logo
  const u8 = (i: number): number => bin.charCodeAt(i), u16 = (i: number): number => (u8(i) << 8) | u8(i + 1);
  if (kind === 'png') return bin.length > 24 ? { w: (u16(16) << 16) | u16(18), h: (u16(20) << 16) | u16(22) } : null;
  for (let i = 2; i + 9 < bin.length;) {
    if (u8(i) !== 0xff) return null;
    const m = u8(i + 1);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: u16(i + 7), h: u16(i + 5) };
    i += 2 + u16(i + 2);
  }
  return null;
}

/**
 * The customer logo of a client presentation on a results sheet (docs/THEME.md §8.6), 48 px high at its own aspect ratio, below the chart
 * picture of the ROI sheet. Only a PNG / JPEG data URL is embedded; a picture ExcelJS cannot read never fails the export.
 */
export function addLogo(wb: Workbook, ws: Worksheet, src: string | undefined, at: { col: number; row: number } = { col: 5, row: 14 }): void {
  const m = src ? /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src) : null;
  if (!m) return;
  const kind = m[1] as 'png' | 'jpeg', size = imageSize(m[2]!, kind), h = 48, w = size && size.h > 0 ? Math.min(240, Math.round((h * size.w) / size.h)) : 144;
  try { ws.addImage(wb.addImage({ base64: m[2]!, extension: kind }), { tl: at, ext: { width: w, height: h } }); } catch { /* an unreadable picture is skipped */ }
}
