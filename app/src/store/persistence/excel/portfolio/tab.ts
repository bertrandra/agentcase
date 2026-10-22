import { ParamsImportError, str } from '../params/safe';
import type { Cell, Sheets } from '../params/types';
import { PF_HEADERS } from './names';

/** One data row of a portfolio sheet with its 1-based sheet row number (for the messages). */
export interface Line { n: number; c: Cell[] }
export interface Tab { name: string; lines: Line[] }

/** Product and wave ids end up in object keys, element ids and file names: the same safe list as the JSON snapshot reader (spec 8). */
export const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function fail(sheet: string, n: number | null, msg: string): never { throw new ParamsImportError(n === null ? `${sheet}: ${msg}` : `${sheet} row ${n}: ${msg}`); }

/** The data rows of a sheet (blank rows dropped), or null when the workbook has no such sheet. A sheet whose header is not ours is refused. */
export function tab(sheets: Sheets, name: string): Tab | null {
  const rows = sheets.get(name);
  if (!rows) return null;
  const head = PF_HEADERS[name] as string[];
  if (str(rows[0]?.[0]) !== head[0] || str(rows[0]?.[1]) !== head[1]) fail(name, 1, `unexpected header (expected "${head.join('", "')}")`);
  const lines: Line[] = [];
  rows.slice(1).forEach((c, i) => { if (c.some((x) => str(x) !== '')) lines.push({ n: i + 2, c }); });
  return { name, lines };
}

export function idOf(t: Tab, l: Line, what: string): string {
  const id = str(l.c[0]);
  if (!SAFE_ID.test(id)) fail(t.name, l.n, `${what} must be 1-64 letters, digits, "_" or "-" (got "${id.slice(0, 40)}")`);
  return id;
}

/** A required known product id. */
export function knownProduct(t: Tab, l: Line, known: ReadonlySet<string>): string {
  const id = idOf(t, l, 'product id');
  if (!known.has(id)) fail(t.name, l.n, `unknown product "${id}" (not in the Products sheet)`);
  return id;
}

/** A number in [min, max] from a cell (blank = undefined when optional). */
export function numberCell(t: Tab, l: Line, i: number, label: string, o: { min: number; max: number; int?: boolean; optional?: boolean }): number | undefined {
  const raw = l.c[i];
  if (str(raw) === '') { if (o.optional) return undefined; fail(t.name, l.n, `${label} is required`); }
  const v = typeof raw === 'number' ? raw : Number(str(raw).replace(',', '.'));
  if (!Number.isFinite(v) || v < o.min || v > o.max || (o.int && !Number.isInteger(v))) fail(t.name, l.n, `${label} must be ${o.int ? 'a whole number' : 'a number'} between ${o.min} and ${o.max} (got "${str(raw).slice(0, 30)}")`);
  return v;
}

/** Yes / No (or blank = undefined); any other text is a type error. */
export function flagCell(t: Tab, l: Line, i: number, label: string): boolean | undefined {
  const s = str(l.c[i]).toLowerCase();
  if (s === '') return undefined;
  if (/^(yes|y|true|1)$/.test(s)) return true;
  if (/^(no|n|false|0)$/.test(s)) return false;
  return fail(t.name, l.n, `${label} must be Yes or No (got "${s.slice(0, 20)}")`);
}
