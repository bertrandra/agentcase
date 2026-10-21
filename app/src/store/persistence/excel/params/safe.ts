import type { Cell } from './types';

/** A file that cannot be imported (malformed, oversize, foreign): the case is left untouched. */
export class ParamsImportError extends Error {}

/** Import hardening (legacy v18.9 safeId/cleanText plus the size limits the legacy lacked). */
export const LIMITS = { fileBytes: 8 * 1024 * 1024, unzippedBytes: 64 * 1024 * 1024, entries: 400, ratio: 200, rows: 20000, cols: 64, text: 5000 };

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
/** True for a key that is safe to use on a plain object (no prototype-pollution names). */
export const okKey = (k: string): boolean => k !== '' && !FORBIDDEN.has(k);

export function safeId(s: unknown): string {
  const r = String(s == null ? '' : s).replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 80);
  return FORBIDDEN.has(r) ? `x-${r}` : r;
}
/* eslint-disable no-control-regex -- stripping control characters is the point of these two helpers */
export const cleanText = (s: unknown, max = 200): string => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
/** Free text that may span lines (vision statement): control characters other than newline/tab are dropped. */
export const longText = (s: unknown, max = LIMITS.text): string => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max);

/* eslint-enable no-control-regex */
export const str = (v: unknown): string => String(v == null ? '' : v).trim();
export const num = (v: unknown): number => parseFloat(String(v));
export const yes = (v: unknown): boolean => /^(yes|y|true|1)$/.test(str(v).toLowerCase());

/** Flatten an ExcelJS cell value to a plain string/number/boolean (formula → result, rich text → text, anything else → ''). */
export function flatten(x: unknown): Cell {
  let v: unknown = x;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const o = v as { text?: unknown; result?: unknown; richText?: { text?: unknown }[] };
    v = o.text != null ? o.text : o.result != null ? o.result : Array.isArray(o.richText) ? o.richText.map((t) => String(t.text ?? '')).join('') : '';
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v;
  return typeof v === 'string' ? v.slice(0, LIMITS.text) : '';
}

/** Bytes as an ArrayBuffer of exactly their own length (a Node Buffer or any typed array is a view on a bigger buffer). */
export function asArrayBuffer(x: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (Object.prototype.toString.call(x) === '[object ArrayBuffer]') return x as ArrayBuffer;   // (not instanceof: the buffer may come from another realm)
  const v = x as ArrayBufferView;
  return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer;
}

/** Reject files that are too big or look like zip bombs before ExcelJS inflates anything: reads the zip central directory only. */
export function guardZip(buf: ArrayBuffer): void {   // (callers pass asArrayBuffer(input))
  if (buf.byteLength > LIMITS.fileBytes) throw new ParamsImportError(`File too large (${Math.round(buf.byteLength / 1024 / 1024)} MB, limit ${LIMITS.fileBytes / 1024 / 1024} MB)`);
  const v = new DataView(buf);
  if (buf.byteLength < 22 || v.getUint32(0, true) !== 0x04034b50) throw new ParamsImportError('Not an .xlsx workbook (zip signature missing)');
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 65535); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new ParamsImportError('Not an .xlsx workbook (zip directory missing)');
  const n = v.getUint16(eocd + 10, true);
  if (n > LIMITS.entries) throw new ParamsImportError(`Workbook has too many parts (${n})`);
  let p = v.getUint32(eocd + 16, true), total = 0;
  for (let i = 0; i < n; i++) {
    if (p + 46 > buf.byteLength || v.getUint32(p, true) !== 0x02014b50) throw new ParamsImportError('Corrupt workbook (zip directory)');
    const comp = v.getUint32(p + 20, true), raw = v.getUint32(p + 24, true);
    if (raw > LIMITS.unzippedBytes || (comp > 0 && raw / comp > LIMITS.ratio && raw > 1024 * 1024)) throw new ParamsImportError('Workbook rejected: part inflates beyond the allowed size');
    total += raw;
    p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  if (total > LIMITS.unzippedBytes) throw new ParamsImportError('Workbook rejected: uncompressed size beyond the allowed limit');
}
