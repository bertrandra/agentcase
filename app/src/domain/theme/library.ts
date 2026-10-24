/** @calc-zone presentation */
/**
 * The theme library of a case (docs/THEME.md §8.4): the built-ins (code, protected) plus `doc.THEMES` (the user themes), `doc.ACTIVE_THEME` (the
 * sequence id in use; absent = 1, the default look) and `doc.THEME_SEQ` (the last sequence id issued, so a deleted theme's id is never reused).
 * Everything read from a document goes through `parseTheme()`: a file edited by hand cannot inject a key, a colour or an axis value the app does not know.
 */
import { AXIS_NAMES, isAxisValue, type ThemeAxes } from './axes';
import { BUILTIN_THEMES } from './catalogue';
import { parseGenerator, type GeneratorSettings } from './generatorSettings';
import { cleanName, DEFAULT_SEQ, FIRST_USER_SEQ, isColourKey, MAX_USER_THEMES, normHex, type ThemeColours, type ThemeDef } from './themeDef';

export interface LibraryDoc { THEMES?: unknown; ACTIVE_THEME?: unknown; THEME_SEQ?: unknown; [key: string]: unknown }
/** The editable content of a theme (what a file or a sheet carries). */
export interface ThemeContent { name: string; description?: string; colours: ThemeColours; axes: Partial<ThemeAxes>; generator?: GeneratorSettings }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validated content of a theme; unknown keys and invalid values are dropped and reported in `notes`. Null when it is not an object. */
export function parseTheme(raw: unknown, notes: string[] = [], where = 'theme'): ThemeContent | null {
  if (!isObj(raw)) { notes.push(`${where}: not an object, ignored.`); return null; }
  const colours: ThemeColours = {}, axes: Record<string, string> = {};
  if (isObj(raw.colours)) for (const [k, v] of Object.entries(raw.colours)) {
    const hex = normHex(v);
    if (isColourKey(k) && hex) colours[k] = hex; else notes.push(`${where}: colour "${cleanName(k)}" ignored (unknown role or not a #rrggbb colour).`);
  }
  if (isObj(raw.axes)) for (const [k, v] of Object.entries(raw.axes)) {
    if ((AXIS_NAMES as string[]).includes(k) && isAxisValue(k as (typeof AXIS_NAMES)[number], v)) axes[k] = v as string;
    else notes.push(`${where}: axis "${cleanName(k)}" ignored (unknown axis or value).`);
  }
  for (const k of Object.keys(raw)) if (!['name', 'description', 'colours', 'axes', 'generator', 'seq', 'id', 'builtin'].includes(k)) notes.push(`${where}: key "${cleanName(k)}" ignored.`);
  const generator = raw.generator === undefined ? null : parseGenerator(raw.generator);
  if (raw.generator !== undefined && !generator) notes.push(`${where}: palette generator settings ignored (no valid seed colour).`);
  const name = cleanName(raw.name) || 'Untitled theme', description = cleanName(raw.description);
  return { name, ...(description ? { description } : {}), colours, axes: axes as Partial<ThemeAxes>, ...(generator ? { generator } : {}) };
}

const isUserSeq = (n: unknown): n is number => Number.isInteger(n) && (n as number) > BUILTIN_THEMES.length && (n as number) < 1e6;

/** The user themes of a case, validated (a duplicate or built-in sequence id is dropped). */
export function userThemes(d: LibraryDoc): ThemeDef[] {
  if (!Array.isArray(d.THEMES)) return [];
  const seen = new Set<number>(), out: ThemeDef[] = [];
  for (const raw of d.THEMES.slice(0, MAX_USER_THEMES)) {
    const seq = isObj(raw) ? raw.seq : undefined, c = parseTheme(raw);
    if (!c || !isUserSeq(seq) || seen.has(seq)) continue;
    seen.add(seq);
    out.push({ seq, id: `theme-${seq}`, builtin: false, ...c });
  }
  return out;
}
/** Built-ins then user themes, in sequence order. */
export const allThemes = (d: LibraryDoc): ThemeDef[] => [...BUILTIN_THEMES, ...userThemes(d)];
export const findTheme = (d: LibraryDoc, seq: number): ThemeDef | undefined => allThemes(d).find((t) => t.seq === seq);
export const isBuiltinSeq = (seq: number): boolean => BUILTIN_THEMES.some((t) => t.seq === seq);
export const defaultTheme = (): ThemeDef => BUILTIN_THEMES[0]!;

/** The sequence id the case uses (an unknown or deleted one falls back to 1). */
export function activeSeq(d: LibraryDoc): number {
  const n = Number(d.ACTIVE_THEME);
  return Number.isInteger(n) && findTheme(d, n) ? n : DEFAULT_SEQ;
}
export const activeTheme = (d: LibraryDoc): ThemeDef => findTheme(d, activeSeq(d)) ?? defaultTheme();

/** The next sequence id: above every id issued in this case (THEME_SEQ) and every stored one, 100 at least. */
export function nextSeq(d: LibraryDoc): number {
  const issued = Number(d.THEME_SEQ), stored = userThemes(d).map((t) => t.seq);
  return Math.max(FIRST_USER_SEQ, (Number.isInteger(issued) ? issued : 0) + 1, ...stored.map((s) => s + 1));
}
/** A name not used by another theme of the library (`base`, then `base 2`, `base 3`…). */
export function uniqueName(d: LibraryDoc, base: string): string {
  const names = new Set(allThemes(d).map((t) => t.name.toLowerCase())), b = cleanName(base) || 'Theme';
  if (!names.has(b.toLowerCase())) return b;
  for (let i = 2; ; i++) if (!names.has(`${b} ${i}`.toLowerCase())) return `${b} ${i}`.slice(0, 60);
}
