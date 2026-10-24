/** @calc-zone presentation */
/**
 * Theme files (docs/THEME.md §8.5): one theme or a whole library as JSON. The sequence ids a file carries are informational: an imported theme
 * always gets a new id in the receiving case. Reading validates every value (`parseTheme`) and caps the size.
 */
import { parseTheme, type ThemeContent } from './library';
import { MAX_USER_THEMES, type ThemeDef } from './themeDef';

export const THEME_FILE_SCHEMA = 'agentcase.themes.v1';
export const THEME_FILE_MAX = 256 * 1024;
export class ThemeFileError extends Error {}

/** The JSON of one or several themes (built-ins included: their content is copied, they import as user themes). */
export function themeFileJson(themes: readonly ThemeDef[]): string {
  const list = themes.map((t) => ({
    seq: t.seq, name: t.name, ...(t.description ? { description: t.description } : {}), colours: { ...t.colours }, axes: { ...t.axes }, ...(t.generator ? { generator: { ...t.generator } } : {}),
  }));
  return JSON.stringify({ _schema: THEME_FILE_SCHEMA, themes: list }, null, 2);
}

/** The file name of an export: `AgentCase_Theme_<name>.json` or `AgentCase_Themes.json`. */
export const themeFileName = (themes: readonly ThemeDef[]): string =>
  themes.length === 1 ? `AgentCase_Theme_${themes[0]!.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'theme'}.json` : 'AgentCase_Themes.json';

/** The themes of a file, validated, with the notes of what was ignored. Throws ThemeFileError on a file that is not a theme file. */
export function readThemeFile(text: string): { themes: ThemeContent[]; notes: string[] } {
  if (text.length > THEME_FILE_MAX) throw new ThemeFileError(`The file is too large (limit ${THEME_FILE_MAX / 1024} KB).`);
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new ThemeFileError('The file is not valid JSON.'); }
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const list = obj && Array.isArray(obj.themes) ? obj.themes : obj && 'colours' in obj ? [obj] : null;
  if (!list) throw new ThemeFileError('No theme in this file (expected {"themes": [...]}).');
  if (obj && obj._schema !== undefined && obj._schema !== THEME_FILE_SCHEMA) throw new ThemeFileError(`Unknown theme file version "${String(obj._schema).slice(0, 40)}".`);
  const notes: string[] = [];
  if (list.length > MAX_USER_THEMES) notes.push(`Only the first ${MAX_USER_THEMES} themes are read.`);
  const themes = list.slice(0, MAX_USER_THEMES).map((t, i) => parseTheme(t, notes, `Theme ${i + 1}`)).filter((t): t is ThemeContent => !!t);
  if (!themes.length) throw new ThemeFileError('No valid theme in this file.');
  return { themes, notes };
}
