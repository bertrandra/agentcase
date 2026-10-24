/** @calc-zone exports */
import type * as XL from 'exceljs';
import { argb, type ThemeValues, type TokenName } from '@/domain/theme';

/**
 * The print theme of a workbook (docs/THEME.md §8.5). A builder receives it from its controller (`controllers/exportTheme.ts`) and binds it to the
 * workbook it creates; the cell-styling helpers read it from the workbook of the cell they style (`cell.workbook`), so the sheet writers need no extra
 * argument. A weak association per workbook object, not a "last theme set": two exports never see each other's theme.
 */
const bound = new WeakMap<XL.Workbook, Readonly<ThemeValues>>();

/** `wb`, styled with `print` (the base theme of the export: never the dark display). */
export function withPrint<W extends XL.Workbook>(wb: W, print: Readonly<ThemeValues>): W {
  bound.set(wb, print);
  return wb;
}
/** ARGB (`FFRRGGBB`) of a colour token in the print theme of `wb`. A workbook built without one is a programming error. */
export function xlArgb(wb: XL.Workbook, name: TokenName): string {
  const t = bound.get(wb);
  if (!t) throw new Error('excel: the workbook has no print theme (build it with withPrint)');
  return argb(t, name);
}
