/** @calc-zone exports */
import { activeSeq, findTheme, isBuiltinSeq, parseTheme, userThemes } from '@/domain/theme/library';
import { DEFAULT_SEQ } from '@/domain/theme/themeDef';
import { blue, frz, head, sheet } from '../kit';
import { cleanText, num, str } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

/**
 * Theme library (docs/THEME.md §8.5, no legacy equivalent): one row per setting of each user theme (name, description, `colour:<role>`,
 * `axis:<axis>`, `generator:seed|contrast|harmony`), plus the active theme and the last sequence id issued. Written only when the case has a user
 * theme or uses another theme than the default one, so a default case exports the legacy sheet list unchanged; a workbook without the sheet leaves
 * the case's library as it is.
 * The customer logo is not carried (an image does not fit a cell; it travels with the case JSON and the HTML snapshot).
 */
const ACTIVE = 'Active theme', LAST = 'Last sequence id';
type Raw = { name?: string; description?: string; colours: Record<string, string>; axes: Record<string, string>; generator?: Record<string, string> };

export const themesToWrite = (d: ParamsDoc): boolean => userThemes(d).length > 0 || activeSeq(d) !== DEFAULT_SEQ;

function write({ wb, d }: WriteCtx): void {
  if (!themesToWrite(d)) return;
  const ws = sheet(wb, 'Themes', [['Theme Seq', 11], ['Theme Name', 26], ['Setting', 24], ['Value', 18]]), active = activeSeq(d);
  const add = (cells: (string | number)[]) => { const r = ws.addRow(cells); [3, 4].forEach((i) => blue(r.getCell(i))); };
  add([active, findTheme(d, active)?.name ?? '', ACTIVE, 'Yes']);
  if (Number.isInteger(Number(d.THEME_SEQ))) add(['', '', LAST, Number(d.THEME_SEQ)]);
  for (const t of userThemes(d)) {
    add([t.seq, t.name, 'name', t.name]);
    if (t.description) add([t.seq, t.name, 'description', t.description]);
    for (const [k, v] of Object.entries(t.colours)) add([t.seq, t.name, `colour:${k}`, v]);
    for (const [k, v] of Object.entries(t.axes)) add([t.seq, t.name, `axis:${k}`, String(v)]);
    for (const [k, v] of Object.entries(t.generator ?? {})) add([t.seq, t.name, `generator:${k}`, typeof v === 'number' ? v : String(v)]);
  }
  head(ws); frz(ws);
}

/** The sheet replaces the case's user themes and active theme; settings and themes that do not validate are skipped with a note. */
function read({ rows, w, notes }: ReadCtx): void {
  const rs = rows('Themes'); if (!rs) return;
  const by = new Map<number, Raw>();
  let active = DEFAULT_SEQ, last = 0;
  for (const x of rs.slice(1)) {
    const seq = num(x[0]), setting = str(x[2]), value = str(x[3]);
    if (setting === ACTIVE) { if (Number.isInteger(seq)) active = seq; continue; }
    if (setting === LAST) { if (Number.isInteger(num(value))) last = num(value); continue; }
    if (!Number.isInteger(seq) || isBuiltinSeq(seq) ||
      seq < 1) { if (setting) notes.push(`Themes: a row of theme "${cleanText(x[0], 20)}" was skipped (not a user theme sequence id).`); continue; }
    const t = by.get(seq) ?? { colours: {}, axes: {} };
    by.set(seq, t);
    const [kind, key] = setting.split(':', 2);
    if (setting === 'name') t.name = cleanText(value, 60);
    else if (setting === 'description') t.description = cleanText(value, 200);
    else if (kind === 'colour' && key) t.colours[key] = value;
    else if (kind === 'axis' && key) t.axes[key] = value;
    else if (kind === 'generator' && key) (t.generator ??= {})[key] = value;
    else notes.push(`Themes: unknown setting "${cleanText(setting, 40)}" skipped.`);
  }
  const list = [...by.entries()].flatMap(([seq, raw]) => { const c = parseTheme(raw, notes, `Themes: theme ${seq}`); return c ? [{ seq, ...c }] : []; });
  if (list.length || w.THEMES !== undefined) w.THEMES = list;
  const issued = Math.max(last, Number(w.THEME_SEQ) || 0, ...list.map((t) => t.seq));
  if (issued) w.THEME_SEQ = issued;
  if (active !== DEFAULT_SEQ && findTheme(w, active)) w.ACTIVE_THEME = active; else delete w.ACTIVE_THEME;
}

export const themesSheet: SheetFamily = { sheets: ['Themes'], write, read };
